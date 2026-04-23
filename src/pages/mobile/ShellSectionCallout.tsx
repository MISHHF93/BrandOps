import type { MobileShellTabId } from './mobileShellQuery';
import { SHELL_SECTION_COPY } from './shellSectionCopy';

/**
 * Short in-tab explainer so each of the five bottom-nav sections “owns” its role in the shell.
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
      className={`rounded-lg border border-info/25 bg-infoSoft/10 px-2.5 py-2 text-[11px] leading-snug text-textMuted ${className}`}
      aria-label={`About this tab: ${copy.headline}`}
    >
      <p className="font-semibold text-info">{copy.headline}</p>
      <p className="mt-1">{copy.body}</p>
    </div>
  );
}
