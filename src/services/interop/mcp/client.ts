/**
 * G17 — BrandOps as an MCP **client**.
 *
 * Everything else in `interop/` faces inward: external AI asking BrandOps for
 * governed work. This faces outward — BrandOps consuming an external MCP server
 * (Gmail, Slack, GitHub, a specialist research agent) so a Plan step can reach
 * a real system.
 *
 * It also closes a clause that has been unsatisfiable until now. The directive
 * says **"External tool output is untrusted data and must pass the Memory
 * Firewall."** That sentence is about output from tools BrandOps *calls*, and
 * BrandOps could not call any. The server-side screen added in Phase 4b covers
 * the analogous inbound case and was documented as *not* the same thing. This is
 * the same thing.
 *
 * Three rules, and they are the whole design:
 *
 * **1. A connection is not a capability.** An external server is reachable only
 * if an operator registered it, and only the tools that registration allowlists
 * can be called. A client that can call anything a server advertises is an
 * exfiltration path wearing a connector's clothes — the remote decides what
 * exists, so the remote must not also decide what is permitted.
 *
 * **2. Every result is untrusted.** Tool output is screened for prompt injection
 * and passed through the Memory Firewall as `mcp-response`, which classifies it
 * `EXTERNAL_SOURCE` — a tier that can never be verified. A remote server is a
 * stranger's process; its output is data that arrived, not instructions that
 * apply.
 *
 * **3. The result is never authoritative.** Nothing here writes workspace state.
 * A caller receives screened content with its provenance and decides what to do
 * with it under the same approval rules as any other proposal.
 *
 * Transport-agnostic on purpose: the caller supplies a `send`, so this module
 * stays pure, testable, and free of Node builtins that the browser bundle would
 * choke on.
 */
import { processThroughFirewall } from '../../memory/memoryFirewall';
import { detectPromptInjection } from '../validation';
import { LATEST_PROTOCOL_VERSION } from './protocol';

/** One JSON-RPC round trip. The caller owns stdio, HTTP, or whatever else. */
export type McpClientTransport = (request: Record<string, unknown>) => Promise<{
  result?: Record<string, unknown>;
  error?: { code: number; message: string; data?: unknown };
}>;

/**
 * An external MCP server BrandOps may consume.
 *
 * `allowedTools` is the point of the type. It is an allowlist, not a filter over
 * what the server advertises: a compromised or updated remote can add
 * `delete_everything` to its own `tools/list` at any moment, and this decides
 * that it was never callable regardless.
 */
export interface ExternalMcpServer {
  id: string;
  label: string;
  /** Tool names an operator authorized. Empty means the server is read-only-by-nothing. */
  allowedTools: readonly string[];
  /** Recorded on every candidate so a reviewer can see which stranger spoke. */
  sourceLabel?: string;
}

export interface McpClientResult {
  ok: boolean;
  /** Screened, sanitized text content. Absent when the call was refused. */
  content?: string;
  /** What the firewall made of it. Always `EXTERNAL_SOURCE` for a remote server. */
  trustTier?: string;
  /** Never true for a remote result — kept explicit so no caller has to infer it. */
  verified: false;
  errorCode?:
    | 'server_not_registered'
    | 'tool_not_allowlisted'
    | 'transport_error'
    | 'remote_error'
    | 'prompt_injection_detected'
    | 'memory_firewall_rejected';
  error?: string;
  /** Provenance line for the audit trail and for a person reading the result. */
  provenance: string;
}

/** `_meta` every 2026-07-28 request must carry. */
function requestMeta(): Record<string, unknown> {
  return {
    'io.modelcontextprotocol/protocolVersion': LATEST_PROTOCOL_VERSION,
    'io.modelcontextprotocol/clientInfo': { name: 'brandops', version: '2.0.0' },
    'io.modelcontextprotocol/clientCapabilities': {}
  };
}

let nextId = 1;

export interface McpClientOptions {
  transport: McpClientTransport;
  /** Servers an operator registered. Anything else is unreachable. */
  servers: readonly ExternalMcpServer[];
}

/**
 * Extracts text from a `CallToolResult`. Structured content is serialized rather
 * than trusted as a shape: a remote server's `outputSchema` is the remote's
 * claim about itself, and this side does not enforce it.
 */
function resultText(result: Record<string, unknown> | undefined): string {
  if (!result) return '';
  const content = result.content;
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        const entry = block as { type?: string; text?: string };
        return entry.type === 'text' && typeof entry.text === 'string' ? entry.text : '';
      })
      .filter(Boolean)
      .join('\n');
  }
  if (result.structuredContent !== undefined) return JSON.stringify(result.structuredContent);
  return '';
}

export function createMcpClient(options: McpClientOptions) {
  const servers = new Map(options.servers.map((server) => [server.id, server]));

  const send = async (method: string, params: Record<string, unknown>) => {
    try {
      return await options.transport({
        jsonrpc: '2.0',
        id: nextId++,
        method,
        params: { ...params, _meta: requestMeta() }
      });
    } catch (error) {
      return {
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : String(error)
        }
      };
    }
  };

  return {
    /**
     * What a registered server advertises, **intersected with what it was
     * allowlisted for**. A remote that starts advertising new tools does not
     * thereby acquire them.
     */
    async listTools(serverId: string): Promise<{ ok: boolean; tools: string[]; error?: string }> {
      const server = servers.get(serverId);
      if (!server) return { ok: false, tools: [], error: `No registered server "${serverId}".` };
      const response = await send('tools/list', {});
      if (response.error) return { ok: false, tools: [], error: response.error.message };
      const advertised = Array.isArray(response.result?.tools) ? response.result.tools : [];
      const names = advertised
        .map((tool) => (tool as { name?: string }).name)
        .filter((name): name is string => typeof name === 'string');
      return { ok: true, tools: names.filter((name) => server.allowedTools.includes(name)) };
    },

    /**
     * Calls an allowlisted tool on a registered server and returns its output as
     * screened, untrusted data.
     */
    async callTool(
      serverId: string,
      toolName: string,
      args: Record<string, unknown> = {}
    ): Promise<McpClientResult> {
      const server = servers.get(serverId);
      const provenance = `mcp://${serverId}/${toolName}`;
      if (!server) {
        return {
          ok: false,
          verified: false,
          errorCode: 'server_not_registered',
          error: `No registered MCP server "${serverId}". Register it before calling it.`,
          provenance
        };
      }
      if (!server.allowedTools.includes(toolName)) {
        return {
          ok: false,
          verified: false,
          errorCode: 'tool_not_allowlisted',
          error: `"${toolName}" is not allowlisted for ${server.label}. The server advertising it does not make it callable.`,
          provenance
        };
      }

      const response = await send('tools/call', { name: toolName, arguments: args });
      if (response.error) {
        return {
          ok: false,
          verified: false,
          errorCode: 'remote_error',
          error: `${server.label} refused: ${response.error.message}`,
          provenance
        };
      }

      const raw = resultText(response.result);

      /**
       * The remote's output is inbound text from a process BrandOps does not
       * control, so it gets the same injection screen as an inbound agent
       * argument — arguably more, since a compromised connector is a likelier
       * carrier than a client that had to authenticate first.
       */
      const injection = detectPromptInjection(raw);
      if (injection.injected) {
        return {
          ok: false,
          verified: false,
          errorCode: 'prompt_injection_detected',
          error: injection.reason ?? 'Remote output matched a prompt-injection signature.',
          provenance
        };
      }

      const verdict = processThroughFirewall({
        content: raw,
        source: 'mcp-response',
        sourceLabel: server.sourceLabel ?? `${server.label} (${serverId})`,
        traceId: provenance
      });
      if (verdict.action === 'reject') {
        return {
          ok: false,
          verified: false,
          errorCode: 'memory_firewall_rejected',
          error: verdict.reason ?? 'The Memory Firewall rejected this remote output.',
          provenance
        };
      }

      return {
        ok: true,
        // The *sanitized* text, not the raw bytes — control characters stripped,
        // whitespace collapsed, length capped by the firewall.
        content: verdict.candidate.content,
        trustTier: verdict.candidate.trustClassification,
        verified: false,
        provenance
      };
    }
  };
}
