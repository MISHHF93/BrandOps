export type CockpitCommandStripItem =
  | { kind: 'run'; label: string; phrase: string }
  | { kind: 'prime'; label: string; phrase: string };

export interface CockpitWorkstreamCommandStripProps {
  ariaLabel: string;
  btnFocus: string;
  commandBusy: boolean;
  runCommand: (command: string) => void | Promise<void>;
  primeChat: (line: string) => void;
  items: readonly CockpitCommandStripItem[];
}

const chip = (btnFocus: string) =>
  `rounded-md border border-border/55 bg-surface/45 px-2 py-1 text-[10px] text-text ${btnFocus} disabled:cursor-not-allowed disabled:opacity-50`;

/**
 * Compact Chat starters for a Cockpit workstream — phrases must match {@link parseCommandRoute} routes.
 */
export const CockpitWorkstreamCommandStrip = ({
  ariaLabel,
  btnFocus,
  commandBusy,
  runCommand,
  primeChat,
  items
}: CockpitWorkstreamCommandStripProps) => (
  <details className="bo-disclosure mt-3" aria-label={ariaLabel}>
    <summary
      className={`cursor-pointer list-none px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-textSoft ${btnFocus} [&::-webkit-details-marker]:hidden`}
    >
      Commands
      <span className="ml-2 font-normal normal-case text-textSoft">{items.length} available</span>
    </summary>
    <div className="border-t border-border/30 px-2.5 pb-2.5 pt-2">
      <p className="text-[10px] leading-snug text-textSoft">
        Run executes now. Review opens Chat with an editable line.
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((item) =>
          item.kind === 'run' ? (
            <button
              key={item.label}
              type="button"
              disabled={commandBusy}
              onClick={() => void runCommand(item.phrase)}
              className={chip(btnFocus)}
            >
              Run: {item.label}
            </button>
          ) : (
            <button
              key={item.label}
              type="button"
              disabled={commandBusy}
              onClick={() => primeChat(item.phrase)}
              className={chip(btnFocus)}
            >
              Review: {item.label}
            </button>
          )
        )}
      </div>
    </div>
  </details>
);
