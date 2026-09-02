/**
 * MCP protocol versioning and the stateless per-request metadata model.
 *
 * The 2026-07-28 revision removed the `initialize` handshake and the
 * `Mcp-Session-Id` header: every request now carries its own protocol version
 * and client capabilities in `_meta.io.modelcontextprotocol/*`, so a server may
 * infer nothing from a previous request on the same connection.
 *
 * BrandOps speaks both eras. Modern clients send per-request metadata; older
 * clients still send `initialize` and are answered at the version they asked
 * for. Era detection is per request, never per connection — which is exactly
 * what the stateless model requires anyway.
 */

/** Versions this server implements, newest first. */
export const SUPPORTED_PROTOCOL_VERSIONS = ['2026-07-28', '2025-06-18', '2025-03-26'] as const;

export type SupportedProtocolVersion = (typeof SUPPORTED_PROTOCOL_VERSIONS)[number];

/** The version used when a client does not (or cannot) state one. */
export const LATEST_PROTOCOL_VERSION: SupportedProtocolVersion = '2026-07-28';

/**
 * First version with the stateless per-request metadata model. At or above
 * this, `_meta` is authoritative and `initialize` is not expected.
 */
export const STATELESS_FROM_VERSION = '2026-07-28';

/**
 * A request that omits `MCP-Protocol-Version` is treated as this version — the
 * last revision that predates the header. Explicitly allowed by the transport
 * spec for servers that support pre-2025-06-18 clients.
 */
export const ASSUMED_LEGACY_VERSION: SupportedProtocolVersion = '2025-03-26';

export const META_PROTOCOL_VERSION = 'io.modelcontextprotocol/protocolVersion';
export const META_CLIENT_INFO = 'io.modelcontextprotocol/clientInfo';
export const META_CLIENT_CAPABILITIES = 'io.modelcontextprotocol/clientCapabilities';
export const META_SERVER_INFO = 'io.modelcontextprotocol/serverInfo';

/** MCP-defined JSON-RPC error codes (reserved sub-range -32020..-32099). */
export const MCP_ERROR = {
  HEADER_MISMATCH: -32020,
  /**
   * The session is unknown, revoked or expired.
   *
   * Distinct from `INTERNAL_ERROR`, which is what a revoked session used to
   * produce over stdio. That told a client its server had a bug — so the sane
   * response is to retry, forever, on a session that will never work again. The
   * HTTP binding already answered `401` for the same condition; this is the
   * stdio equivalent, in the server-defined range the other codes here use.
   */
  UNAUTHORIZED: -32023,
  MISSING_REQUIRED_CLIENT_CAPABILITY: -32021,
  UNSUPPORTED_PROTOCOL_VERSION: -32022,
  INVALID_PARAMS: -32602,
  METHOD_NOT_FOUND: -32601,
  PARSE_ERROR: -32700,
  INTERNAL_ERROR: -32603
} as const;

/**
 * A JSON-RPC notification is a request with **no `id` member at all** — not
 * `id: null`, which is the id a *response* carries when the request could not be
 * parsed. A server MUST NOT reply to one.
 *
 * This lives here, rather than in either transport, because both transports got
 * it wrong in different ways. Driving the gateway the way a foreign client does
 * found it: stdio answered `notifications/initialized` with `-32601`, and the
 * HTTP binding checked for a notification *after* dispatch, so its own `-32601`
 * returned first — a correct 202 branch sitting just below code that could never
 * reach it.
 *
 * `notifications/initialized` is not an edge case. It is the third message of
 * the standard MCP handshake, so every conforming client sent one and got an
 * error back while connecting.
 */
export function isJsonRpcNotification(raw: unknown): boolean {
  return typeof raw === 'object' && raw !== null && !('id' in (raw as object));
}

/** Every `notifications/*` method is a notification by definition in MCP. */
export function isNotificationMethod(method: string): boolean {
  return method.startsWith('notifications/');
}

export const SERVER_INFO = { name: 'brandops-agent-gateway', version: '2.0.0' } as const;

export function isSupportedProtocolVersion(value: string): value is SupportedProtocolVersion {
  return (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(value);
}

/** True for revisions that carry protocol metadata per request rather than per session. */
export function isStatelessVersion(version: string): boolean {
  return version >= STATELESS_FROM_VERSION;
}

export interface JsonRpcErrorBody {
  jsonrpc: '2.0';
  id: string | number | null;
  error: { code: number; message: string; data?: unknown };
}

export function jsonRpcError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcErrorBody {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message, ...(data !== undefined ? { data } : {}) }
  };
}

/** `UnsupportedProtocolVersionError` — carries what this server does support. */
export function unsupportedProtocolVersionError(
  id: string | number | null,
  requested: string
): JsonRpcErrorBody {
  return jsonRpcError(
    id,
    MCP_ERROR.UNSUPPORTED_PROTOCOL_VERSION,
    `Unsupported protocol version: ${requested}`,
    { supported: [...SUPPORTED_PROTOCOL_VERSIONS] }
  );
}

/** `MissingRequiredClientCapabilityError` — names what the client must declare. */
export function missingClientCapabilityError(
  id: string | number | null,
  requiredCapabilities: string[]
): JsonRpcErrorBody {
  return jsonRpcError(
    id,
    MCP_ERROR.MISSING_REQUIRED_CLIENT_CAPABILITY,
    `Request requires client capabilities that were not declared: ${requiredCapabilities.join(', ')}`,
    { requiredCapabilities }
  );
}

export interface RequestMeta {
  protocolVersion?: string;
  clientInfo?: { name?: string; version?: string };
  clientCapabilities?: Record<string, unknown>;
  raw: Record<string, unknown>;
}

export function readRequestMeta(params: Record<string, unknown> | undefined): RequestMeta {
  const raw = ((params?._meta ?? {}) as Record<string, unknown>) || {};
  const version = raw[META_PROTOCOL_VERSION];
  const clientInfo = raw[META_CLIENT_INFO] as { name?: string; version?: string } | undefined;
  const capabilities = raw[META_CLIENT_CAPABILITIES] as Record<string, unknown> | undefined;
  return {
    protocolVersion: typeof version === 'string' ? version : undefined,
    clientInfo: clientInfo && typeof clientInfo === 'object' ? clientInfo : undefined,
    clientCapabilities: capabilities && typeof capabilities === 'object' ? capabilities : undefined,
    raw
  };
}

export interface MetaValidation {
  ok: boolean;
  /** The version this request is being served at. */
  version: string;
  error?: JsonRpcErrorBody;
}

/**
 * Validate the per-request metadata for a stateless-era request.
 *
 * `protocolVersion` and `clientCapabilities` are both required by the spec;
 * a request missing either is malformed (`-32602`). A version this server does
 * not implement is `-32022` with the supported list, so the client can retry at
 * a version that works instead of guessing.
 */
export function validateRequestMeta(
  id: string | number | null,
  params: Record<string, unknown> | undefined,
  /** Version asserted by the transport envelope, when there is one. */
  envelopeVersion?: string
): MetaValidation {
  const meta = readRequestMeta(params);
  const declared = meta.protocolVersion ?? envelopeVersion;

  // Legacy-era clients carry no per-request metadata; they are served at the
  // version the envelope (or the absence of a header) implies.
  if (!declared) {
    return { ok: true, version: ASSUMED_LEGACY_VERSION };
  }

  if (!isSupportedProtocolVersion(declared)) {
    return {
      ok: false,
      version: declared,
      error: unsupportedProtocolVersionError(id, declared)
    };
  }

  if (!isStatelessVersion(declared)) {
    return { ok: true, version: declared };
  }

  if (!meta.protocolVersion) {
    return {
      ok: false,
      version: declared,
      error: jsonRpcError(
        id,
        MCP_ERROR.INVALID_PARAMS,
        `Missing required _meta field: ${META_PROTOCOL_VERSION}`
      )
    };
  }
  if (!meta.clientCapabilities) {
    return {
      ok: false,
      version: declared,
      error: jsonRpcError(
        id,
        MCP_ERROR.INVALID_PARAMS,
        `Missing required _meta field: ${META_CLIENT_CAPABILITIES}`
      )
    };
  }

  return { ok: true, version: declared };
}

/**
 * Stamp a result with `resultType` and the server's identity.
 *
 * Every 2026-07-28 result must carry `resultType`; older clients simply ignore
 * it (an absent value is read as `"complete"`), so it is safe to emit always.
 */
export function withResultEnvelope(
  result: Record<string, unknown>,
  resultType = 'complete'
): Record<string, unknown> {
  const existingMeta = (result._meta as Record<string, unknown> | undefined) ?? {};
  return {
    resultType: (result.resultType as string | undefined) ?? resultType,
    ...result,
    _meta: { ...existingMeta, [META_SERVER_INFO]: SERVER_INFO }
  };
}

/** Whether a client declared a given extension in its per-request capabilities. */
export function clientDeclaredExtension(
  params: Record<string, unknown> | undefined,
  extension: string
): boolean {
  const meta = readRequestMeta(params);
  const extensions = (meta.clientCapabilities?.extensions ?? {}) as Record<string, unknown>;
  return extension in extensions;
}
