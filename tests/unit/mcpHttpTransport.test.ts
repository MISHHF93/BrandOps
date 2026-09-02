import { describe, expect, it } from 'vitest';
import {
  decodeHeaderValue,
  handleMcpHttpRequest,
  protectedResourceMetadata,
  type DispatchResult,
  type McpHttpConfig,
  type McpHttpRequest
} from '../../src/services/interop/mcp/httpTransport';
import {
  ASSUMED_LEGACY_VERSION,
  isStatelessVersion,
  LATEST_PROTOCOL_VERSION,
  MCP_ERROR,
  META_CLIENT_CAPABILITIES,
  META_PROTOCOL_VERSION,
  META_SERVER_INFO,
  SUPPORTED_PROTOCOL_VERSIONS,
  validateRequestMeta,
  withResultEnvelope
} from '../../src/services/interop/mcp/protocol';

const CONFIG: McpHttpConfig = {
  canonicalUri: 'http://127.0.0.1:8787/mcp',
  mcpPath: '/mcp',
  allowedOrigins: [],
  authorizationServers: [],
  scopesSupported: ['context.read', 'action.request']
};

const VALID_TOKEN = 'good-token';

const DEFAULT_BODY = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {
    _meta: {
      [META_PROTOCOL_VERSION]: LATEST_PROTOCOL_VERSION,
      [META_CLIENT_CAPABILITIES]: {}
    }
  }
};

function post(overrides: Partial<McpHttpRequest> = {}, body?: unknown): McpHttpRequest {
  const { headers: headerOverrides, ...rest } = overrides;
  return {
    method: 'POST',
    path: '/mcp',
    body: JSON.stringify(body ?? DEFAULT_BODY),
    ...rest,
    headers: {
      authorization: `Bearer ${VALID_TOKEN}`,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': LATEST_PROTOCOL_VERSION,
      'mcp-method': 'tools/list',
      ...headerOverrides
    }
  };
}

function handlers(dispatch?: (input: { method: string }) => Promise<DispatchResult>) {
  return {
    authenticate: async (token: string) =>
      token === VALID_TOKEN
        ? { ok: true, sessionId: 'session-1' }
        : { ok: false, errorDescription: 'Unknown token.' },
    dispatch:
      dispatch ??
      (async ({ method }: { method: string }) =>
        method === 'tools/list'
          ? { result: { tools: [] } }
          : {
              methodNotFound: true,
              error: { code: -32601, message: `Method not found: ${method}` }
            })
  };
}

function parse(body: string | undefined) {
  return JSON.parse(body ?? '{}');
}

describe('MCP HTTP: authorization surface', () => {
  it('serves Protected Resource Metadata without a token — discovery cannot need auth', async () => {
    const res = await handleMcpHttpRequest(
      { method: 'GET', path: '/.well-known/oauth-protected-resource', headers: {}, body: '' },
      CONFIG,
      handlers()
    );
    expect(res.status).toBe(200);
    const doc = parse(res.body);
    expect(doc.resource).toBe(CONFIG.canonicalUri);
    expect(doc.bearer_methods_supported).toEqual(['header']);
    expect(doc.scopes_supported).toContain('context.read');
  });

  it('challenges an unauthenticated call with a resource_metadata pointer', async () => {
    const res = await handleMcpHttpRequest(
      post({ headers: { authorization: undefined } }),
      CONFIG,
      handlers()
    );
    expect(res.status).toBe(401);
    const challenge = res.headers['www-authenticate'];
    expect(challenge).toContain('Bearer');
    expect(challenge).toContain(
      'resource_metadata="http://127.0.0.1:8787/.well-known/oauth-protected-resource"'
    );
    // No scope on the anonymous challenge: the server does not yet know what the
    // caller wants, and listing every scope would invite over-broad grants.
    expect(challenge).not.toContain('scope=');
  });

  it('rejects a token that does not resolve to a session', async () => {
    const res = await handleMcpHttpRequest(
      post({ headers: { authorization: 'Bearer nope' } }),
      CONFIG,
      handlers()
    );
    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toContain('error="invalid_token"');
  });

  it('answers a capability the session lacks with 403 insufficient_scope naming the scope', async () => {
    const res = await handleMcpHttpRequest(
      post(
        { headers: { 'mcp-method': 'tools/call', 'mcp-name': 'brandops_request_action' } },
        {
          jsonrpc: '2.0',
          id: 7,
          method: 'tools/call',
          params: {
            name: 'brandops_request_action',
            arguments: {},
            _meta: {
              [META_PROTOCOL_VERSION]: LATEST_PROTOCOL_VERSION,
              [META_CLIENT_CAPABILITIES]: {}
            }
          }
        }
      ),
      CONFIG,
      handlers(async () => ({
        error: {
          code: MCP_ERROR.INVALID_PARAMS,
          message: 'Session is not granted action.request.'
        },
        insufficientScope: ['action.request']
      }))
    );
    expect(res.status).toBe(403);
    const challenge = res.headers['www-authenticate'];
    expect(challenge).toContain('error="insufficient_scope"');
    expect(challenge).toContain('scope="action.request"');
    expect(challenge).toContain('resource_metadata=');
  });
});

describe('MCP HTTP: DNS rebinding protection', () => {
  it('rejects a cross-origin request outright, before authentication', async () => {
    const res = await handleMcpHttpRequest(
      post({ headers: { origin: 'https://evil.example', authorization: undefined } }),
      CONFIG,
      handlers()
    );
    // 403, not 401: the origin is refused regardless of whether a token follows.
    expect(res.status).toBe(403);
    expect(parse(res.body).error.message).toContain('Origin not allowed');
  });

  it('accepts an allowlisted origin', async () => {
    const res = await handleMcpHttpRequest(
      post({ headers: { origin: 'https://app.brandops.test' } }),
      { ...CONFIG, allowedOrigins: ['https://app.brandops.test'] },
      handlers()
    );
    expect(res.status).toBe(200);
  });

  it('allows a request with no Origin header at all — non-browser clients send none', async () => {
    const res = await handleMcpHttpRequest(post(), CONFIG, handlers());
    expect(res.status).toBe(200);
  });
});

describe('MCP HTTP: binding shape', () => {
  it('answers GET and DELETE on the MCP endpoint with 405', async () => {
    for (const method of ['GET', 'DELETE']) {
      const res = await handleMcpHttpRequest(
        { method, path: '/mcp', headers: {}, body: '' },
        CONFIG,
        handlers()
      );
      expect(res.status).toBe(405);
      expect(res.headers.allow).toBe('POST');
    }
  });

  it('answers an unknown path with 404', async () => {
    const res = await handleMcpHttpRequest(post({ path: '/nope' }), CONFIG, handlers());
    expect(res.status).toBe(404);
  });

  it('answers an unimplemented method with 404 and -32601', async () => {
    const res = await handleMcpHttpRequest(
      post(
        { headers: { 'mcp-method': 'resources/list' } },
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'resources/list',
          params: {
            _meta: {
              [META_PROTOCOL_VERSION]: LATEST_PROTOCOL_VERSION,
              [META_CLIENT_CAPABILITIES]: {}
            }
          }
        }
      ),
      CONFIG,
      handlers()
    );
    expect(res.status).toBe(404);
    expect(parse(res.body).error.code).toBe(MCP_ERROR.METHOD_NOT_FOUND);
  });

  it('acknowledges a notification with 202 and no body', async () => {
    const res = await handleMcpHttpRequest(
      post(
        { headers: { 'mcp-method': 'notifications/progress' } },
        {
          jsonrpc: '2.0',
          method: 'notifications/progress',
          params: {
            _meta: {
              [META_PROTOCOL_VERSION]: LATEST_PROTOCOL_VERSION,
              [META_CLIENT_CAPABILITIES]: {}
            }
          }
        }
      ),
      CONFIG,
      handlers(async () => ({ result: {} }))
    );
    expect(res.status).toBe(202);
    expect(res.body).toBeUndefined();
  });

  it('stamps every result with resultType and serverInfo', async () => {
    const res = await handleMcpHttpRequest(post(), CONFIG, handlers());
    const body = parse(res.body);
    expect(body.result.resultType).toBe('complete');
    expect(body.result._meta[META_SERVER_INFO].name).toBe('brandops-agent-gateway');
  });
});

describe('MCP HTTP: mirrored header validation', () => {
  it('rejects a Mcp-Method header that disagrees with the body', async () => {
    const res = await handleMcpHttpRequest(
      post({ headers: { 'mcp-method': 'tools/call' } }),
      CONFIG,
      handlers()
    );
    expect(res.status).toBe(400);
    expect(parse(res.body).error.code).toBe(MCP_ERROR.HEADER_MISMATCH);
  });

  it('requires Mcp-Name on tools/call and rejects a mismatch', async () => {
    const body = {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'brandops_get_current_goals',
        arguments: {},
        _meta: {
          [META_PROTOCOL_VERSION]: LATEST_PROTOCOL_VERSION,
          [META_CLIENT_CAPABILITIES]: {}
        }
      }
    };
    const missing = await handleMcpHttpRequest(
      post({ headers: { 'mcp-method': 'tools/call' } }, body),
      CONFIG,
      handlers()
    );
    expect(missing.status).toBe(400);
    expect(parse(missing.body).error.message).toContain('Mcp-Name is required');

    const wrong = await handleMcpHttpRequest(
      post({ headers: { 'mcp-method': 'tools/call', 'mcp-name': 'other_tool' } }, body),
      CONFIG,
      handlers()
    );
    expect(wrong.status).toBe(400);
    expect(parse(wrong.body).error.code).toBe(MCP_ERROR.HEADER_MISMATCH);
  });

  it('decodes the base64 sentinel before comparing Mcp-Name', async () => {
    // "Hello, 世界" cannot travel as a plain ASCII header value.
    const encoded = '=?base64?SGVsbG8sIOS4lueVjA==?=';
    expect(decodeHeaderValue(encoded)).toBe('Hello, 世界');
    expect(decodeHeaderValue('plain')).toBe('plain');

    const res = await handleMcpHttpRequest(
      post(
        { headers: { 'mcp-method': 'tools/call', 'mcp-name': encoded } },
        {
          jsonrpc: '2.0',
          id: 6,
          method: 'tools/call',
          params: {
            name: 'Hello, 世界',
            arguments: {},
            _meta: {
              [META_PROTOCOL_VERSION]: LATEST_PROTOCOL_VERSION,
              [META_CLIENT_CAPABILITIES]: {}
            }
          }
        }
      ),
      CONFIG,
      handlers(async () => ({ result: { ok: true } }))
    );
    expect(res.status).toBe(200);
  });

  it('rejects a protocol-version header that disagrees with _meta', async () => {
    const res = await handleMcpHttpRequest(
      post(
        { headers: { 'mcp-protocol-version': '2025-06-18' } },
        {
          jsonrpc: '2.0',
          id: 8,
          method: 'tools/list',
          params: {
            _meta: {
              [META_PROTOCOL_VERSION]: LATEST_PROTOCOL_VERSION,
              [META_CLIENT_CAPABILITIES]: {}
            }
          }
        }
      ),
      CONFIG,
      handlers()
    );
    expect(res.status).toBe(400);
    expect(parse(res.body).error.code).toBe(MCP_ERROR.HEADER_MISMATCH);
  });
});

describe('MCP HTTP: version negotiation', () => {
  it('rejects an unsupported version with the supported list', async () => {
    const res = await handleMcpHttpRequest(
      post(
        { headers: { 'mcp-protocol-version': '1999-01-01' } },
        {
          jsonrpc: '2.0',
          id: 9,
          method: 'tools/list',
          params: {
            _meta: { [META_PROTOCOL_VERSION]: '1999-01-01', [META_CLIENT_CAPABILITIES]: {} }
          }
        }
      ),
      CONFIG,
      handlers()
    );
    expect(res.status).toBe(400);
    const body = parse(res.body);
    expect(body.error.code).toBe(MCP_ERROR.UNSUPPORTED_PROTOCOL_VERSION);
    expect(body.error.data.supported).toEqual([...SUPPORTED_PROTOCOL_VERSIONS]);
  });

  it('rejects a stateless-era request missing required _meta', async () => {
    const res = await handleMcpHttpRequest(
      post({}, { jsonrpc: '2.0', id: 10, method: 'tools/list', params: {} }),
      CONFIG,
      handlers()
    );
    expect(res.status).toBe(400);
    const body = parse(res.body);
    expect(body.error.code).toBe(MCP_ERROR.INVALID_PARAMS);
    expect(body.error.message).toContain(META_PROTOCOL_VERSION);
  });

  it('serves a legacy client that sends no version header at all', async () => {
    const res = await handleMcpHttpRequest(
      post(
        { headers: { 'mcp-protocol-version': undefined } },
        { jsonrpc: '2.0', id: 11, method: 'tools/list', params: {} }
      ),
      CONFIG,
      handlers()
    );
    // No header and no _meta is the pre-2025-06-18 era, which is still served.
    expect(res.status).toBe(200);
  });
});

describe('MCP protocol module', () => {
  it('knows which versions are stateless', () => {
    expect(isStatelessVersion('2026-07-28')).toBe(true);
    expect(isStatelessVersion('2025-03-26')).toBe(false);
    expect(LATEST_PROTOCOL_VERSION).toBe('2026-07-28');
    expect(ASSUMED_LEGACY_VERSION).toBe('2025-03-26');
  });

  it('requires clientCapabilities on a stateless request', () => {
    const verdict = validateRequestMeta(1, {
      _meta: { [META_PROTOCOL_VERSION]: '2026-07-28' }
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.error?.error.message).toContain(META_CLIENT_CAPABILITIES);
  });

  it('does not demand _meta from a legacy-era request', () => {
    const verdict = validateRequestMeta(1, {}, '2025-03-26');
    expect(verdict.ok).toBe(true);
    expect(verdict.version).toBe('2025-03-26');
  });

  it('preserves an explicit resultType instead of overwriting it', () => {
    const enveloped = withResultEnvelope({ resultType: 'task', taskId: 'br_task_1' });
    expect(enveloped.resultType).toBe('task');
    expect(enveloped.taskId).toBe('br_task_1');
  });

  it('advertises no authorization server when none is configured', () => {
    const doc = protectedResourceMetadata(CONFIG);
    // Honest: an empty list says "no OAuth AS integrated", not "any token works".
    expect(doc.authorization_servers).toEqual([]);
  });
});
