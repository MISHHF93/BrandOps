import clsx from 'clsx';
import { ChevronDown, Library } from 'lucide-react';
import type { AiCitationChunk } from '../../types/domain';
import { formatEvidenceChipTitle } from '../../services/ai/aiIoProvenance';
import { evidenceDetailDomId } from '../../services/ai/aiInlineCitations';

function formatTimestamp(iso?: string): string | null {
  if (!iso || typeof iso !== 'string') return null;
  const t = iso.trim();
  if (!t.length) return null;
  const d = Date.parse(t);
  if (Number.isNaN(d)) return t.slice(0, 19);
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(d);
  } catch {
    return t.slice(0, 19);
  }
}

export function AssistantEvidenceChips({
  citations,
  btnFocus,
  anchorPrefix
}: {
  citations: AiCitationChunk[];
  btnFocus: string;
  /** When set, each card receives a stable id for inline `[cite: …]` scroll targets. */
  anchorPrefix?: string;
}) {
  if (!citations.length) return null;

  return (
    <div className="bo-ai-evidence-stack mt-2 space-y-1.5" aria-label="Evidence citations">
      <p className="text-overline font-bold uppercase tracking-wide text-textMuted">Evidence</p>
      <div className="flex flex-wrap gap-1.5">
        {citations.map((c, i) => {
          const title = formatEvidenceChipTitle(c);
          const ts = formatTimestamp(c.retrieval_timestamp);
          const key = `${String(c.chunk_id ?? 'c')}-${i}`;
          const domId = anchorPrefix ? evidenceDetailDomId(anchorPrefix, c, i) : undefined;
          return (
            <details
              key={key}
              id={domId}
              className="group min-w-0 max-w-full rounded-lg border border-border/55 bg-bgElevated/45 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary
                className={clsx(
                  'flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surfaceActive/40',
                  btnFocus
                )}
              >
                <Library className="h-3 w-3 shrink-0 text-accent" strokeWidth={2.25} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-meta font-semibold leading-tight text-text">
                  {title}
                </span>
                {ts ? (
                  <span className="shrink-0 font-mono text-overline text-textSoft" title={c.retrieval_timestamp}>
                    {ts}
                  </span>
                ) : null}
                <ChevronDown
                  className="h-3.5 w-3.5 shrink-0 text-textMuted transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="space-y-1 border-t border-border/35 px-2 py-2 text-fine leading-snug text-textMuted">
                {c.source_type ? (
                  <p>
                    <span className="font-semibold text-textSoft">Type </span>
                    <span className="font-mono text-text">{c.source_type}</span>
                  </p>
                ) : null}
                {c.chunk_id !== undefined && c.chunk_id !== null ? (
                  <p className="break-all">
                    <span className="font-semibold text-textSoft">Chunk </span>
                    <span className="font-mono text-text">{String(c.chunk_id)}</span>
                  </p>
                ) : null}
                {c.workspace_entity_id ? (
                  <p className="break-all">
                    <span className="font-semibold text-textSoft">Workspace entity </span>
                    <span className="font-mono text-text">{c.workspace_entity_id}</span>
                  </p>
                ) : null}
                {c.embedding_region ? (
                  <p className="break-all">
                    <span className="font-semibold text-textSoft">Embedding region </span>
                    {c.embedding_region}
                  </p>
                ) : null}
                {c.multimodal?.modality ? (
                  <p>
                    <span className="font-semibold text-textSoft">Modality </span>
                    <span className="font-mono">{c.multimodal.modality}</span>
                    {c.multimodal.mime_type ? (
                      <span className="text-textMuted"> · {c.multimodal.mime_type}</span>
                    ) : null}
                  </p>
                ) : null}
                {c.multimodal?.uri_hint ? (
                  <p className="break-all font-mono text-overline text-textSoft">{c.multimodal.uri_hint}</p>
                ) : null}
                {c.excerpt ? (
                  <blockquote className="border-l-2 border-accent/35 pl-2 text-textSoft italic">
                    {c.excerpt}
                  </blockquote>
                ) : null}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
