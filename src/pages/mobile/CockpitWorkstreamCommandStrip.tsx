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

const chip =
  (btnFocus: string) =>
  `rounded-full border border-border/55 bg-surface/55 px-2 py-0.5 text-[10px] text-text ${btnFocus} disabled:cursor-not-allowed disabled:opacity-50`;

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
  <div
    role="group"
    aria-label={ariaLabel}
    className="mt-3 rounded-lg border border-border/55 bg-bgSubtle/45 px-2.5 py-2"
  >
    <p className="text-[10px] font-semibold uppercase tracking-wide text-textSoft">Quick commands</p>
    <p className="mt-1 text-[10px] leading-snug text-textSoft">
      Run sends the line in Chat. When several rows could match, the agent uses its default order — use{' '}
      <span className="text-textMuted">Prime</span> to open Chat with a tailored line.
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
            {item.label}
          </button>
        ) : (
          <button
            key={item.label}
            type="button"
            disabled={commandBusy}
            onClick={() => primeChat(item.phrase)}
            className={chip(btnFocus)}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  </div>
);
