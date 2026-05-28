import clsx from 'clsx';
import { CalendarClock, FileText, Linkedin, Mail, MessageSquareText } from 'lucide-react';
import type {
  PlatformActionCard,
  PlatformActionPlatform
} from '../../services/plan/platformActionCards';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';

function platformIcon(platform: PlatformActionPlatform) {
  switch (platform) {
    case 'Gmail':
      return Mail;
    case 'LinkedIn':
      return Linkedin;
    case 'Google Calendar':
      return CalendarClock;
    case 'Notion':
      return FileText;
    case 'Slack':
      return MessageSquareText;
    default:
      return FileText;
  }
}

function PlatformCard({
  card,
  btnFocus,
  disabled,
  runCommand
}: {
  card: PlatformActionCard;
  btnFocus: string;
  disabled: boolean;
  runCommand: (command: string) => void | Promise<void>;
}) {
  const Icon = platformIcon(card.platform);
  return (
    <article
      className="rounded-xl border border-border/45 bg-bgElevated/60 p-3"
      aria-labelledby={`${card.id}-heading`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-fine font-semibold uppercase tracking-wide text-primary">
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {card.platform}
          </p>
          <h3 id={`${card.id}-heading`} className="mt-1 text-label font-semibold text-text">
            {card.title}
          </h3>
          <p className="mt-1 text-meta leading-snug text-textMuted">{card.description}</p>
        </div>
        <span className="rounded-full border border-warning/40 bg-warningSoft/15 px-2 py-0.5 text-overline font-bold uppercase text-warning">
          Approval gated
        </span>
      </div>

      <div className="mt-3 rounded-lg border border-border/35 bg-bgSubtle/45 px-2.5 py-2">
        <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
          Source context
        </p>
        {card.sourceContext.length ? (
          <ul className="mt-1 space-y-1 text-fine leading-snug text-textMuted">
            {card.sourceContext.slice(0, 3).map((item) => (
              <li key={item} className="line-clamp-2">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-fine leading-snug text-textMuted">
            Connected platform metadata is available; no approved summaries attached yet.
          </p>
        )}
      </div>

      <p className="mt-2 text-fine leading-snug text-textSoft">{card.approvalRequirement}</p>

      <div className="mt-3 flex flex-wrap gap-1.5 text-meta">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void runCommand(card.command)}
          className={clsx(
            'rounded-lg border border-border/45 bg-surface/60 px-2.5 py-1.5 font-semibold text-text disabled:opacity-45',
            btnFocus
          )}
        >
          Preview action
        </button>
        <a
          href="#plan-human-approval-queue"
          className={clsx(
            'rounded-lg border border-warning/40 bg-warningSoft/15 px-2.5 py-1.5 font-semibold text-warning',
            btnFocus
          )}
        >
          Approval queue
        </a>
      </div>
    </article>
  );
}

export function PlanPlatformActionCards({
  snapshot,
  btnFocus,
  commandBusy,
  canRunWorkspaceCommands,
  runCommand
}: {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  commandBusy: boolean;
  canRunWorkspaceCommands: boolean;
  runCommand: (command: string) => void | Promise<void>;
}) {
  const cards = snapshot.platformActionCards;
  const disabled = commandBusy || !canRunWorkspaceCommands;
  const platforms = Array.from(new Set(cards.map((card) => card.platform)));

  return (
    <section
      id="plan-platform-action-cards"
      className="scroll-mt-28 rounded-2xl border border-primary/25 bg-primarySoft/10 p-3.5"
      aria-labelledby="plan-platform-action-cards-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-meta font-semibold uppercase tracking-[0.14em] text-primary">
            Platform Action Cards
          </p>
          <h2 id="plan-platform-action-cards-heading" className="mt-1 text-h3 text-text">
            Act from connected platforms
          </h2>
          <p className="mt-1 text-meta leading-snug text-textMuted">
            Cards appear only for supported platform context BrandOps can see. They draft,
            summarize, plan, or prep work inside BrandOps; external execution still requires
            approval.
          </p>
        </div>
        <span className="rounded-full border border-border/45 bg-bgElevated px-2 py-1 text-fine font-semibold text-textMuted">
          {cards.length} card{cards.length === 1 ? '' : 's'}
        </span>
      </div>

      {platforms.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Supported action platforms">
          {platforms.map((platform) => (
            <span
              key={platform}
              className="rounded-full border border-border/35 bg-bgSubtle/65 px-2 py-1 text-fine text-textMuted"
            >
              {platform}
            </span>
          ))}
        </div>
      ) : null}

      {cards.length === 0 ? (
        <p className="mt-3 rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2 text-meta text-textMuted">
          No platform action cards yet. Connect Gmail/Google Workspace, LinkedIn, Calendar, Notion,
          or Slack context to unlock grounded actions. Unsupported integrations are not shown.
        </p>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {cards.map((card) => (
            <PlatformCard
              key={card.id}
              card={card}
              btnFocus={btnFocus}
              disabled={disabled}
              runCommand={runCommand}
            />
          ))}
        </div>
      )}
    </section>
  );
}
