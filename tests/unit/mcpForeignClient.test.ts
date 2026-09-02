/**
 * The protocol as a stranger drives it.
 *
 * Every other MCP suite here exercises the gateway the way *our* hosts do, and
 * our hosts happen to be well-behaved: they always send an id, always name a
 * tool, always speak the newest revision. That is exactly the shape of test that
 * cannot find an interop bug, because it never does what a foreign client does.
 *
 * Driving it as a stranger found two, and both were in the seam between the
 * protocol and the transports rather than inside either one:
 *
 *   - `notifications/initialized` — the third message of the standard MCP
 *     handshake — was answered with `-32601`. Every conforming client got an
 *     error back while connecting.
 *   - `tools/call` with no `name` returned a *successful* result carrying
 *     `unknown_tool`, having minted a session and written an audit entry for a
 *     call that named nothing.
 *
 * The HTTP binding already had a correct 202 branch for notifications. It sat
 * below the dispatch, so the dispatcher's own error returned before anything
 * could reach it — a right answer in unreachable code, which is the most
 * expensive kind of duplication because it reads as covered.
 */
import { describe, expect, it } from 'vitest';
import { dispatchMcpMethod, listMcpTools } from '../../src/services/interop/mcp/server';
import {
  isJsonRpcNotification,
  isNotificationMethod,
  MCP_ERROR,
  SUPPORTED_PROTOCOL_VERSIONS,
  validateRequestMeta
} from '../../src/services/interop/mcp/protocol';

/** A `_meta` block as a real client sends it. */
function meta(version = '2026-07-28') {
  return {
    _meta: {
      'io.modelcontextprotocol/protocolVersion': version,
      'io.modelcontextprotocol/clientInfo': { name: 'foreign-client', version: '1.0.0' },
      'io.modelcontextprotocol/clientCapabilities': {}
    }
  };
}

const handlers = {
  callTool: async (name: string) => ({
    ok: false,
    capabilityId: 'context.read',
    errorCode: 'unknown_tool',
    error: 'Unknown capability or tool: ' + name,
    data: {},
    checkpointIds: [],
    auditEntryId: 'audit-1'
  })
} as unknown as Parameters<typeof dispatchMcpMethod>[0]['handlers'];

describe('notifications', () => {
  it('recognises a notification by an absent id, not a null one', () => {
    expect(isJsonRpcNotification({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBe(
      true
    );
    // `id: null` is what a *response* carries when a request could not be
    // parsed. A request that spells it out is malformed, not a notification —
    // conflating the two makes an unanswerable request out of an answerable one.
    expect(isJsonRpcNotification({ jsonrpc: '2.0', id: null, method: 'ping' })).toBe(false);
    expect(isJsonRpcNotification({ jsonrpc: '2.0', id: 0, method: 'ping' })).toBe(false);
    expect(isJsonRpcNotification(null)).toBe(false);
    expect(isJsonRpcNotification('not an object')).toBe(false);
  });

  it('knows the handshake notification by name', () => {
    for (const method of [
      'notifications/initialized',
      'notifications/cancelled',
      'notifications/progress',
      'notifications/roots/list_changed'
    ]) {
      expect(isNotificationMethod(method), method).toBe(true);
    }
    expect(isNotificationMethod('tools/call')).toBe(false);
  });

  it('acknowledges a mislabelled notification rather than refusing it', async () => {
    // A client that attaches an id to `notifications/initialized` is wrong, but
    // failing its connection over a message that wanted no reply is worse.
    const outcome = await dispatchMcpMethod({
      method: 'notifications/initialized',
      params: meta(),
      handlers
    });
    expect(outcome.error).toBeUndefined();
    expect(outcome.result).toEqual({});
  });
});

describe('malformed requests are protocol errors, not tool results', () => {
  it('rejects tools/call with no tool name', async () => {
    const outcome = await dispatchMcpMethod({ method: 'tools/call', params: meta(), handlers });
    // Not `{ ok: false, errorCode: 'unknown_tool' }` inside a success: nothing
    // ran, so nothing should report having run.
    expect(outcome.result).toBeUndefined();
    expect(outcome.error?.code).toBe(MCP_ERROR.INVALID_PARAMS);
    expect(outcome.error?.message).toContain('params.name');
  });

  it('rejects a tool name that is only whitespace', async () => {
    const outcome = await dispatchMcpMethod({
      method: 'tools/call',
      params: { ...meta(), name: '   ' },
      handlers
    });
    expect(outcome.error?.code).toBe(MCP_ERROR.INVALID_PARAMS);
  });

  it('rejects resources/read with no uri', async () => {
    const outcome = await dispatchMcpMethod({
      method: 'resources/read',
      params: meta(),
      handlers: {
        ...handlers,
        resources: {
          list: async () => [],
          templates: async () => [],
          read: async () => {
            throw new Error('read must not be called without a uri');
          }
        }
      }
    } as unknown as Parameters<typeof dispatchMcpMethod>[0]);
    expect(outcome.error?.code).toBe(MCP_ERROR.INVALID_PARAMS);
    expect(outcome.error?.message).toContain('params.uri');
  });

  it('still refuses an unknown method', async () => {
    const outcome = await dispatchMcpMethod({
      method: 'nonexistent/method',
      params: meta(),
      handlers
    });
    expect(outcome.error?.code).toBe(MCP_ERROR.METHOD_NOT_FOUND);
  });
});

describe('version negotiation as a stranger performs it', () => {
  it('serves every revision it advertises', async () => {
    for (const version of SUPPORTED_PROTOCOL_VERSIONS) {
      const outcome = await dispatchMcpMethod({
        method: 'tools/list',
        params: meta(version),
        handlers
      });
      // Advertising a version during negotiation and then failing a request at
      // it is the interop failure a client cannot work around.
      expect(outcome.error, version).toBeUndefined();
      expect((outcome.result as { tools: unknown[] }).tools.length, version).toBeGreaterThan(0);
    }
  });

  /**
   * Negotiation is enforced in `validateRequestMeta`, which both transports call
   * *before* dispatch — so that is where it is tested. Asserting it against
   * `dispatchMcpMethod` would pass a version the dispatcher never inspects and
   * prove nothing about what a client actually receives.
   */
  it('names the versions it does support when refusing one it does not', () => {
    const check = validateRequestMeta(1, meta('1999-01-01'));
    expect(check.ok).toBe(false);
    expect(check.error?.error.code).toBe(MCP_ERROR.UNSUPPORTED_PROTOCOL_VERSION);
    // A bare refusal makes the client guess; the supported list lets it retry.
    expect((check.error?.error.data as { supported: string[] }).supported).toEqual([
      ...SUPPORTED_PROTOCOL_VERSIONS
    ]);
  });

  it('accepts each advertised revision at the transport boundary too', () => {
    for (const version of SUPPORTED_PROTOCOL_VERSIONS) {
      const check = validateRequestMeta(1, meta(version));
      expect(check.ok, version).toBe(true);
      expect(check.version, version).toBe(version);
    }
  });

  it('serves a legacy client that sends no _meta at all', async () => {
    // Pre-stateless clients carry no version block. Requiring one would refuse
    // every client written against the older spec.
    const check = validateRequestMeta(1, {});
    expect(check.ok).toBe(true);
    const outcome = await dispatchMcpMethod({ method: 'tools/list', params: {}, handlers });
    expect(outcome.error).toBeUndefined();
  });
});

describe('the advertised surface is self-consistent', () => {
  it('gives every tool a name a client can actually call', () => {
    for (const tool of listMcpTools()) {
      expect(tool.name, tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(tool.description.length, tool.name).toBeGreaterThan(10);
      expect(tool.inputSchema.type, tool.name).toBe('object');
      // A required property absent from `properties` is a schema a strict client
      // cannot satisfy: it would have to send a field the schema never describes.
      for (const required of tool.inputSchema.required) {
        expect(Object.keys(tool.inputSchema.properties), tool.name + '.' + required).toContain(
          required
        );
      }
    }
  });
});
