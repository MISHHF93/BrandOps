import type { CopilotWorker } from '../../types/domain';

export type ParsedStructuredAiApply =
  | { kind: 'none' }
  | { kind: 'execute_agent_command'; commandText: string };

const MAX_COMMAND_CHARS = 240;

/** Stable fingerprint for embedding source text (no crypto deps). */
export function fingerprintTextSnippet(raw: string): string {
  const t = raw.trim().slice(0, 6000);
  let h = 5381;
  for (let i = 0; i < t.length; i++) {
    h = (h * 33) ^ t.charCodeAt(i);
  }
  return `fp-${(h >>> 0).toString(16)}`;
}

/** Pull first fenced ```json block, else first `{` … `}` slice heuristic. */
export function extractFirstJsonString(modelText: string): string | null {
  const fence = modelText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const blob = fence ? fence[1].trim() : modelText.trim();
  const start = blob.indexOf('{');
  const end = blob.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  return blob.slice(start, end + 1);
}

/** Normalize for matching structured executeAgentCommand strings across hyphenation / spacing. */
export function normalizeAgentCommandToken(commandText: string): string {
  return commandText
    .trim()
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseStructuredAiApplyPayload(modelText: string): ParsedStructuredAiApply {
  const jsonRaw = extractFirstJsonString(modelText);
  if (!jsonRaw) return { kind: 'none' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonRaw) as unknown;
  } catch {
    return { kind: 'none' };
  }
  if (!parsed || typeof parsed !== 'object') return { kind: 'none' };
  const root = parsed as Record<string, unknown>;
  const payload = root.brandOpsStructuredApply ?? root.brand_ops_structured_apply;
  if (!payload || typeof payload !== 'object') return { kind: 'none' };
  const p = payload as Record<string, unknown>;
  if (p.version !== 1 && p.version !== '1') return { kind: 'none' };
  const cmd = p.executeAgentCommand ?? p.execute_agent_command;
  if (typeof cmd !== 'string') return { kind: 'none' };
  const trimmed = cmd.trim().slice(0, MAX_COMMAND_CHARS);
  if (!trimmed.length) return { kind: 'none' };
  // Printable-ish ASCII only (avoid odd unicode injection through gateway copy/paste).
  if (!/^[\x20-\x7E]+$/.test(trimmed)) return { kind: 'none' };
  return { kind: 'execute_agent_command', commandText: trimmed };
}

/** Per-worker allow-list for structured JSON auto-exec; empty list => never auto-run. */
export function isAllowedForWorker(worker: CopilotWorker | null, commandText: string): boolean {
  const cmds = worker?.allowedAgentCommands;
  if (!cmds?.length) return false;
  const n = normalizeAgentCommandToken(commandText);
  return cmds.some((a) => normalizeAgentCommandToken(a) === n);
}

/** Legacy global check — equivalent to a worker allowing canonical pipeline health phrasing. */
export function isAllowedAutoExecuteAiCommand(commandText: string): boolean {
  const n = normalizeAgentCommandToken(commandText);
  return n === 'pipeline health';
}
