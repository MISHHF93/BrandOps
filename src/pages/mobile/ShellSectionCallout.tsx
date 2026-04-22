import type { MobileShellTabId } from './mobileShellQuery';
import { SHELL_SECTION_COPY } from './shellSectionCopy';

/**
 * Short in-tab explainer so each of the four sections “owns” its role in the shell.
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
      className={`rounded-lg border border-indigo-500/20 bg-indigo-950/20 px-2.5 py-2 text-[11px] leading-snug text-zinc-400 ${className}`}
      aria-label={`About this tab: ${copy.headline}`}
    >
      <p className="font-semibold text-indigo-200/95">{copy.headline}</p>
      <p className="mt-1">{copy.body}</p>
    </div>
  );
}
