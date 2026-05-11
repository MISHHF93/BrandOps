import { useMemo } from 'react';
import clsx from 'clsx';
import type { AiCitationChunk } from '../../types/domain';
import {
  buildCitationLookupMap,
  evidenceDetailDomId,
  focusEvidenceElement,
  resolveCitationMarker,
  splitInlineCitationSegments
} from '../../services/ai/aiInlineCitations';

export function AssistantInlineCitationBody({
  text,
  citations,
  messageAnchorPrefix,
  btnFocus
}: {
  text: string;
  citations: AiCitationChunk[];
  messageAnchorPrefix: string;
  btnFocus: string;
}) {
  const segments = useMemo(() => splitInlineCitationSegments(text), [text]);
  const lookup = useMemo(() => buildCitationLookupMap(citations), [citations]);

  if (segments.length === 1 && segments[0].type === 'text') {
    return <p className="whitespace-pre-wrap break-words leading-relaxed">{segments[0].text}</p>;
  }

  return (
    <p className="whitespace-pre-wrap break-words leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <span key={`t-${i}`}>{seg.text}</span>;
        }
        const resolved = resolveCitationMarker(seg.marker, lookup);
        const citeIdx = resolved ? citations.indexOf(resolved) : -1;
        const targetId =
          resolved != null
            ? evidenceDetailDomId(messageAnchorPrefix, resolved, citeIdx >= 0 ? citeIdx : 0)
            : null;

        return (
          <button
            key={`c-${i}-${seg.marker}`}
            type="button"
            className={clsx(
              'mx-0.5 inline-flex min-h-[1.35rem] cursor-pointer items-center rounded-md border px-1 py-px align-baseline font-mono text-fine font-bold leading-none transition-colors',
              resolved
                ? 'border-accent/45 bg-accentSoft/25 text-accent hover:bg-accentSoft/45'
                : 'border-warning/40 bg-warningSoft/18 text-warning hover:bg-warningSoft/28',
              btnFocus
            )}
            title={
              resolved
                ? `Show evidence for citation ${seg.marker}`
                : `Unresolved citation — no provenance row for “${seg.marker}”`
            }
            aria-label={
              resolved
                ? `Open evidence card for citation ${seg.marker}`
                : `Unresolved citation ${seg.marker}`
            }
            onClick={() => {
              if (targetId) focusEvidenceElement(targetId);
            }}
          >
            <span aria-hidden className="text-overline font-semibold opacity-80">
              [
            </span>
            {seg.marker}
            <span aria-hidden className="text-overline font-semibold opacity-80">
              ]
            </span>
          </button>
        );
      })}
    </p>
  );
}
