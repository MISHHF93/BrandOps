/**
 * Streamable HTTP binding for the BrandOps MCP endpoint, plus the OAuth 2.1
 * resource-server surface that guards it.
 *
 * Written as a pure request → response function: no `node:http`, no framework.
 * The host process (or a future edge deployment) supplies IO; everything that
 * decides *whether* a request is allowed lives here and is directly testable.
 *
 * What this implements from 2026-07-28:
 * - A single MCP endpoint accepting POST. GET/DELETE answer 405 — the GET
 *   stream and DELETE session teardown were removed in this revision.
 * - `Origin` validation with 403, and localhost-only binding by the host, which
 *   together are what stop a web page from driving a local MCP server via DNS
 *   rebinding.
 * - Mirrored request metadata (`MCP-Protocol-Version`, `Mcp-Method`, `Mcp-Name`)
 *   validated against the body, including the `=?base64?…?=` sentinel. The body
 *   is the source of truth; a mismatch is `-32020` so a load balancer routing on
 *   headers can never disagree with what the server executes.
 * - Version negotiation (`-32022` with the supported list) and stateless
 *   per-request `_meta` validation (`-32602`).
 * - RFC 9728 Protected Resource Metadata and RFC 6750 challenges.
 *
 * What it deliberately does not implement: SSE response streams and
 * `subscriptions/listen`. A server may answer any request with a single JSON
 * object, and BrandOps always does. Long-running work is already durable and
 * pollable through the Tasks extension, so nothing here needs a held-open
 * stream.
 *
 * Sessions are ignored on purpose: `Mcp-Session-Id` and `Last-Event-ID` are
 * neither minted nor echoed, per the revision's guidance for older clients.
 */
import {
  ASSUMED_LEGACY_VERSION,
  jsonRpcError,
  MCP_ERROR,
  SUPPORTED_PROTOCOL_VERSIONS,
  validateRequestMeta,
  withResultEnvelope,
  type JsonRpcErrorBody,
  isJsonRpcNotification
} from './protocol';

export interface McpHttpConfig {
  /**
   * Canonical URI of this MCP server (RFC 8707), e.g. `http://127.0.0.1:8787/mcp`.
   * Tokens are only accepted when presented to this resource.
   */
  canonicalUri: string;
  /** Path of the MCP endpoint. Defaults to the canonical URI's path. */
  mcpPath: string;
  /**
   * Origins allowed to call this endpoint. Empty means "reject every request
   * that carries an Origin header" — the right default for a local server that
   * only ever expects non-browser clients.
   */
  allowedOrigins: string[];
  /** Authorization servers advertised in Protected Resource Metadata. */
  authorizationServers: string[];
  /** Scopes advertised as supported. BrandOps capability ids double as scopes. */
  scopesSupported: string[];
}

export interface McpHttpRequest {
  method: string;
  /** Path only, without query string. */
  path: string;
  headers: Record<string, string | string[] | undefined>;
  /** Raw request body; may be empty for GET. */
  body: string;
}

export interface McpHttpResponse {
  status: number;
  headers: Record<string, string>;
  /** Absent for 202/204 responses. */
  body?: string;
}

/** Outcome of authenticating a bearer token against BrandOps sessions. */
export interface HttpAuthResult {
  ok: boolean;
  sessionId?: string;
  /** `invalid_token` → 401; anything else is treated as a 401 as well. */
  errorDescription?: string;
}

export interface DispatchResult {
  /** JSON-RPC `result` object, when the call succeeded at the protocol level. */
  result?: Record<string, unknown>;
  /** JSON-RPC error, when it did not. */
  error?: { code: number; message: string; data?: unknown };
  /**
   * Set when the failure was an authorization one: the caller's session lacks
   * the capability. Surfaced as HTTP 403 `insufficient_scope` naming the
   * capability, since BrandOps capability ids are the scopes.
   */
  insufficientScope?: string[];
  /** Set when the method is not implemented, so the binding can answer 404. */
  methodNotFound?: boolean;
}

export interface McpHttpHandlers {
  authenticate: (token: string) => Promise<HttpAuthResult>;
  dispatch: (input: {
    method: string;
    params: Record<string, unknown>;
    id: string | number | null;
    protocolVersion: string;
    sessionId: string;
  }) => Promise<DispatchResult>;
}

const JSON_HEADERS = { 'content-type': 'application/json' } as const;

/** `Mcp-Name` and `Mcp-Param-*` values may arrive Base64-wrapped. */
const BASE64_SENTINEL = /^=\?base64\?(.*)\?=$/;

function header(req: McpHttpRequest, name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(req.headers)) {
    if (key.toLowerCase() !== lower) continue;
    return Array.isArray(value) ? value[0] : value;
  }
  return undefined;
}

/** Decode the Base64 sentinel form if present; otherwise return the value as-is. */
export function decodeHeaderValue(value: string): string {
  const match = BASE64_SENTINEL.exec(value);
  if (!match) return value;
  try {
    // atob is available in both Node 18+ and browsers.
    const binary = atob(match[1]);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return value;
  }
}

function errorResponse(status: number, body: JsonRpcErrorBody, extra?: Record<string, string>) {
  return {
    status,
    headers: { ...JSON_HEADERS, ...(extra ?? {}) },
    body: JSON.stringify(body)
  };
}

/** RFC 9728 Protected Resource Metadata document. */
export function protectedResourceMetadata(config: McpHttpConfig): Record<string, unknown> {
  return {
    resource: config.canonicalUri,
    authorization_servers: config.authorizationServers,
    scopes_supported: config.scopesSupported,
    bearer_methods_supported: ['header'],
    resource_name: 'BrandOps MCP Gateway',
    resource_documentation: 'https://github.com/MISHHF93/BrandOps'
  };
}

function metadataUrl(config: McpHttpConfig): string {
  try {
    const url = new URL(config.canonicalUri);
    return `${url.origin}/.well-known/oauth-protected-resource`;
  } catch {
    return '/.well-known/oauth-protected-resource';
  }
}

/**
 * RFC 6750 challenge for a missing or invalid token.
 *
 * Deliberately carries no `scope` parameter. At this point the server has not
 * authenticated the caller and does not know which operation it will attempt;
 * naming every scope here would push clients to request far more authority than
 * the work needs. Omitting it is spec-legal — the client falls back to the
 * minimal `scopes_supported` in Protected Resource Metadata — and anything
 * beyond that is granted through a precise `insufficient_scope` step-up.
 */
function unauthorized(config: McpHttpConfig, description?: string): McpHttpResponse {
  const parts = [`Bearer resource_metadata="${metadataUrl(config)}"`];
  if (description) parts.push(`error="invalid_token", error_description="${description}"`);
  return errorResponse(
    401,
    jsonRpcError(null, MCP_ERROR.INVALID_PARAMS, description ?? 'Authorization required.'),
    { 'www-authenticate': parts.join(', ') }
  );
}

/** RFC 6750 challenge naming the scopes this operation actually needed. */
function insufficientScope(
  config: McpHttpConfig,
  id: string | number | null,
  scopes: string[],
  message: string
): McpHttpResponse {
  const challenge = [
    'Bearer error="insufficient_scope"',
    `scope="${scopes.join(' ')}"`,
    `resource_metadata="${metadataUrl(config)}"`,
    `error_description="${message.replace(/"/g, "'")}"`
  ].join(', ');
  return errorResponse(403, jsonRpcError(id, MCP_ERROR.INVALID_PARAMS, message), {
    'www-authenticate': challenge
  });
}

function headerMismatch(id: string | number | null, message: string): McpHttpResponse {
  return errorResponse(400, jsonRpcError(id, MCP_ERROR.HEADER_MISMATCH, message));
}

/** Methods whose `Mcp-Name` header mirrors a body field. */
const NAMED_METHODS: Record<string, 'name' | 'uri'> = {
  'tools/call': 'name',
  'resources/read': 'uri',
  'prompts/get': 'name'
};

export async function handleMcpHttpRequest(
  req: McpHttpRequest,
  config: McpHttpConfig,
  handlers: McpHttpHandlers
): Promise<McpHttpResponse> {
  const method = req.method.toUpperCase();

  // ── Protected Resource Metadata is deliberately unauthenticated ──────
  // A client cannot learn how to authenticate if discovery needs a token.
  if (method === 'GET' && req.path === '/.well-known/oauth-protected-resource') {
    return {
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify(protectedResourceMetadata(config), null, 2)
    };
  }

  /**
   * Origin validation before anything else. A browser page on another origin
   * must be stopped before it can reach authentication, let alone dispatch.
   */
  const origin = header(req, 'origin');
  if (origin !== undefined && !config.allowedOrigins.includes(origin)) {
    return errorResponse(
      403,
      jsonRpcError(null, MCP_ERROR.INVALID_PARAMS, `Origin not allowed: ${origin}`)
    );
  }

  if (req.path !== config.mcpPath) {
    return errorResponse(
      404,
      jsonRpcError(null, MCP_ERROR.METHOD_NOT_FOUND, `No MCP endpoint at ${req.path}`)
    );
  }

  // The GET stream and DELETE teardown were removed in this revision.
  if (method !== 'POST') {
    return {
      status: 405,
      headers: { ...JSON_HEADERS, allow: 'POST' },
      body: JSON.stringify(
        jsonRpcError(
          null,
          MCP_ERROR.METHOD_NOT_FOUND,
          `${method} is not supported on the MCP endpoint; this revision defines POST only.`
        )
      )
    };
  }

  // ── Authentication ────────────────────────────────────────────────────
  const authorization = header(req, 'authorization') ?? '';
  const bearer = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  if (!bearer) {
    return unauthorized(config);
  }
  const auth = await handlers.authenticate(bearer[1].trim());
  if (!auth.ok || !auth.sessionId) {
    return unauthorized(config, auth.errorDescription ?? 'The access token is not valid here.');
  }

  // ── Body ──────────────────────────────────────────────────────────────
  let parsed: {
    jsonrpc?: string;
    id?: string | number | null;
    method?: string;
    params?: Record<string, unknown>;
  };
  try {
    parsed = JSON.parse(req.body || '{}');
  } catch {
    return errorResponse(400, jsonRpcError(null, MCP_ERROR.PARSE_ERROR, 'Parse error'));
  }

  /**
   * Acknowledged before anything else runs.
   *
   * This check used to sit *below* the dispatch, so a notification the
   * dispatcher did not recognise — `notifications/initialized`, which every
   * conforming client sends during the handshake — returned that error instead
   * of ever reaching the 202. It also keyed on `parsed.id ?? null`, which cannot
   * tell an absent id from an explicit `"id": null`; only the first is a
   * notification. Both transports now ask `protocol.ts` the same question.
   */
  if (isJsonRpcNotification(parsed)) {
    return { status: 202, headers: {} };
  }

  const id = parsed.id ?? null;
  const rpcMethod = typeof parsed.method === 'string' ? parsed.method : '';
  const params = (parsed.params as Record<string, unknown>) ?? {};
  if (!rpcMethod) {
    return errorResponse(
      400,
      jsonRpcError(id, MCP_ERROR.INVALID_PARAMS, 'Request is missing a method.')
    );
  }

  // ── Mirrored header validation ────────────────────────────────────────
  const versionHeader = header(req, 'mcp-protocol-version');
  const methodHeader = header(req, 'mcp-method');
  const nameHeader = header(req, 'mcp-name');

  if (methodHeader !== undefined && methodHeader !== rpcMethod) {
    return headerMismatch(
      id,
      `Header mismatch: Mcp-Method header value '${methodHeader}' does not match body value '${rpcMethod}'`
    );
  }

  const nameField = NAMED_METHODS[rpcMethod];
  if (nameField) {
    const bodyName = typeof params[nameField] === 'string' ? (params[nameField] as string) : '';
    if (nameHeader === undefined) {
      return headerMismatch(id, `Header mismatch: Mcp-Name is required for ${rpcMethod}`);
    }
    if (decodeHeaderValue(nameHeader) !== bodyName) {
      return headerMismatch(
        id,
        `Header mismatch: Mcp-Name header value '${decodeHeaderValue(nameHeader)}' does not match body value '${bodyName}'`
      );
    }
  }

  // ── Version negotiation ───────────────────────────────────────────────
  const metaVersion = ((params._meta as Record<string, unknown> | undefined) ?? {})[
    'io.modelcontextprotocol/protocolVersion'
  ];
  if (
    versionHeader !== undefined &&
    typeof metaVersion === 'string' &&
    versionHeader !== metaVersion
  ) {
    return headerMismatch(
      id,
      `Header mismatch: MCP-Protocol-Version header value '${versionHeader}' does not match _meta value '${metaVersion}'`
    );
  }

  const envelopeVersion = versionHeader ?? ASSUMED_LEGACY_VERSION;
  if (!(SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(envelopeVersion)) {
    return errorResponse(400, {
      jsonrpc: '2.0',
      id,
      error: {
        code: MCP_ERROR.UNSUPPORTED_PROTOCOL_VERSION,
        message: `Unsupported protocol version: ${envelopeVersion}`,
        data: { supported: [...SUPPORTED_PROTOCOL_VERSIONS] }
      }
    });
  }

  const metaCheck = validateRequestMeta(id, params, envelopeVersion);
  if (!metaCheck.ok && metaCheck.error) {
    return errorResponse(400, metaCheck.error);
  }

  // ── Dispatch ──────────────────────────────────────────────────────────
  const outcome = await handlers.dispatch({
    method: rpcMethod,
    params,
    id,
    protocolVersion: metaCheck.version,
    sessionId: auth.sessionId
  });

  if (outcome.methodNotFound) {
    return errorResponse(
      404,
      jsonRpcError(
        id,
        MCP_ERROR.METHOD_NOT_FOUND,
        outcome.error?.message ?? `Method not found: ${rpcMethod}`
      )
    );
  }

  if (outcome.insufficientScope?.length) {
    return insufficientScope(
      config,
      id,
      outcome.insufficientScope,
      outcome.error?.message ?? 'The session lacks the capability this call requires.'
    );
  }

  if (outcome.error) {
    return errorResponse(
      200,
      jsonRpcError(id, outcome.error.code, outcome.error.message, outcome.error.data)
    );
  }

  return {
    status: 200,
    headers: JSON_HEADERS,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      result: withResultEnvelope(outcome.result ?? {})
    })
  };
}
