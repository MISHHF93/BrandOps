import type { MobileShellTabId } from './mobileShellQuery';
import { SHELL_SECTION_COPY } from './shellSectionCopy';

/**
 * Compact one-line ribbon so each of the five bottom-nav sections still “owns” its role, without
 * repeating a whole paragraph next to the page header. The full body string survives inside an
 * sr-only span so screen readers (and SSR assertions) keep the original contract.
 */
export function ShellSectionCallout({
  tab,
  className = ''
}: {
  tab: MobileShellTabId;
  className?: string;
}) {
  const copy = SHELL_SECTION_COPY[tab];
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-info/25 bg-infoSoft/10 px-2.5 py-1.5 text-[11px] leading-snug text-info ${className}`}
      aria-label={`About this tab: ${copy.headline}`}
    >
      <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-info/80" aria-hidden />
      <span className="font-semibold">{copy.headline}</span>
      <span className="sr-only">. {copy.body}</span>
    </div>
  );
}
