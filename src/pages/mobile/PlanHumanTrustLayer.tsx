import clsx from 'clsx';
import {
  CheckCircle2,
  Eye,
  FileText,
  History,
  Pencil,
  RefreshCw,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import type { HumanTrustControl, HumanTrustControlType } from '../../services/plan/humanTrustLayer';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';

const CONTROL_ICONS: Record<HumanTrustControlType, typeof Eye> = {
  preview: Eye,
  approval: CheckCircle2,
  edit: Pencil,
  reject: XCircle,
  retry: RefreshCw,
  receipts: FileText,
  'audit-history': History
};

function controlTone(type: HumanTrustControlType): string {
  switch (type) {
    case 'approval':
      return 'border-success/45 bg-successSoft/15 text-success';
    case 'reject':
      return 'border-danger/40 bg-dangerSoft/15 text-danger';
    case 'retry':
      return 'border-warning/40 bg-warningSoft/15 text-warning';
    case 'receipts':
    case 'audit-history':
      return 'border-primary/35 bg-primarySoft/15 text-primary';
    default:
      return 'border-border/45 bg-surface/60 text-text';
  }
}

function TrustControlButton({
  control,
  btnFocus,
  disabled,
  runCommand
}: {
  control: HumanTrustControl;
  btnFocus: string;
  disabled: boolean;
  runCommand: (command: string) => void | Promise<void>;
}) {
  const Icon = CONTROL_ICONS[control.type];
  const className = clsx(
    'rounded-lg border px-2 py-1.5 text-left text-fine font-semibold disabled:opacity-45',
    controlTone(control.type),
    btnFocus
  );

  if (control.href) {
    return (
      <a href={control.href} className={className} title={control.description}>
        <Icon className="mr-1 inline h-3.5 w-3.5" aria-hidden />
        {control.label}
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled || !control.command}
      onClick={() => (control.command ? void runCommand(control.command) : undefined)}
      className={className}
      title={control.description}
    >
      <Icon className="mr-1 inline h-3.5 w-3.5" aria-hidden />
      {control.label}
    </button>
  );
}

export function PlanHumanTrustLayer({
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
  const trust = snapshot.humanTrustLayer;
  const disabled = commandBusy || !canRunWorkspaceCommands;

  return (
    <section
      id="plan-human-trust-layer"
      className="scroll-mt-28 rounded-2xl border border-success/30 bg-successSoft/10 p-3.5"
      aria-labelledby="plan-human-trust-layer-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.14em] text-success">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Human Trust Layer
          </p>
          <h2 id="plan-human-trust-layer-heading" className="mt-1 text-h3 text-text">
            Safe, controlled, transparent execution
          </h2>
          <p className="mt-1 text-meta leading-snug text-textMuted">{trust.policy}</p>
        </div>
        <span className="rounded-full border border-success/35 bg-bgElevated px-2 py-1 text-fine font-semibold text-success">
          {trust.totalActions} guarded action{trust.totalActions === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-border/35 bg-bgElevated/55 px-2.5 py-2">
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
            User control
          </p>
          <p className="mt-1 text-meta text-text">
            Preview, approve, edit, reject, and retry stay visible before external action.
          </p>
        </div>
        <div className="rounded-xl border border-border/35 bg-bgElevated/55 px-2.5 py-2">
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
            Evidence trail
          </p>
          <p className="mt-1 text-meta text-text">
            Receipts and audit history explain what happened, where, and why.
          </p>
        </div>
        <div className="rounded-xl border border-border/35 bg-bgElevated/55 px-2.5 py-2">
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
            Autonomy limit
          </p>
          <p className="mt-1 text-meta text-text">
            BrandOps can draft and queue; it cannot silently send, post, sync, or write.
          </p>
        </div>
      </div>

      {trust.actions.length === 0 ? (
        <p className="mt-3 rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2 text-meta text-textMuted">
          No guarded cross-platform actions yet. Connect platforms, create an action card, or build
          a cross-platform PLAN to activate controls.
        </p>
      ) : (
        <div className="mt-3 grid gap-2">
          {trust.actions.slice(0, 8).map((action) => (
            <article
              key={action.id}
              className="rounded-xl border border-border/40 bg-bgElevated/65 p-3"
              aria-labelledby={`${action.id}-heading`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 id={`${action.id}-heading`} className="text-label font-semibold text-text">
                    {action.title}
                  </h3>
                  <p className="mt-0.5 text-fine text-textSoft">
                    {action.location} · {action.status}
                  </p>
                </div>
                <span className="rounded-full border border-warning/40 bg-warningSoft/15 px-2 py-0.5 text-overline font-bold uppercase text-warning">
                  {action.riskLevel === 'external-gated' ? 'External gated' : 'Workspace only'}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {action.controls.map((control) => (
                  <TrustControlButton
                    key={control.type}
                    control={control}
                    btnFocus={btnFocus}
                    disabled={disabled}
                    runCommand={runCommand}
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
