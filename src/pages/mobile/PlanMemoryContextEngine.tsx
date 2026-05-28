import clsx from 'clsx';
import { Eye, Pencil, Power, ShieldCheck, Trash2, BrainCircuit } from 'lucide-react';
import type {
  MemoryContextCategory,
  MemoryContextEntry
} from '../../services/memory/memoryContextEngine';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';

const CATEGORY_LABELS: Record<MemoryContextCategory, string> = {
  goals: 'Goals',
  preferences: 'Preferences',
  'recurring-actions': 'Recurring actions',
  'behavioral-patterns': 'Behavioral patterns',
  'preferred-workflows': 'Preferred workflows',
  'approved-outputs': 'Approved outputs',
  'rejected-outputs': 'Rejected outputs',
  'communication-style': 'Communication style',
  'scheduling-habits': 'Scheduling habits'
};

function confidenceTone(confidence: number): string {
  if (confidence >= 80) return 'border-success/45 bg-successSoft/20 text-success';
  if (confidence >= 65) return 'border-info/45 bg-infoSoft/20 text-info';
  if (confidence >= 45) return 'border-warning/45 bg-warningSoft/20 text-warning';
  return 'border-border/45 bg-bgSubtle/70 text-textMuted';
}

function EntryRow({ entry }: { entry: MemoryContextEntry }) {
  return (
    <li className="rounded-lg border border-border/35 bg-bgSubtle/45 px-2.5 py-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
            {entry.label}
          </p>
          <p className="mt-1 line-clamp-3 text-fine leading-snug text-textMuted">{entry.value}</p>
          <p className="mt-1 text-overline font-semibold uppercase text-textSoft">
            {entry.source} · {entry.editable ? 'editable' : 'derived'}
          </p>
        </div>
        <span
          className={clsx(
            'rounded-full border px-1.5 py-0.5 text-overline font-bold uppercase',
            confidenceTone(entry.confidence)
          )}
        >
          {entry.confidence}%
        </span>
      </div>
    </li>
  );
}

export function PlanMemoryContextEngine({
  snapshot,
  btnFocus,
  commandBusy,
  canRunWorkspaceCommands,
  runCommand,
  onDeleteMemory,
  onDisableMemory
}: {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  commandBusy: boolean;
  canRunWorkspaceCommands: boolean;
  runCommand: (command: string) => void | Promise<void>;
  onDeleteMemory?: () => void | Promise<void>;
  onDisableMemory?: () => void | Promise<void>;
}) {
  const readout = snapshot.memoryContextEngine;
  const disabled = commandBusy || !canRunWorkspaceCommands;
  const categoryRows = Object.entries(readout.entriesByCategory).filter(([, entries]) => entries.length);

  return (
    <section
      id="plan-memory-context-engine"
      className="scroll-mt-28 rounded-2xl border border-primary/30 bg-primarySoft/10 p-3.5"
      aria-labelledby="plan-memory-context-engine-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.14em] text-primary">
            <BrainCircuit className="h-4 w-4" aria-hidden />
            Memory & Context Engine
          </p>
          <h2 id="plan-memory-context-engine-heading" className="mt-1 text-h3 text-text">
            Persistent local memory for ASK, PLAN, predictions, and workflows
          </h2>
          <p className="mt-1 text-meta leading-snug text-textMuted">
            BrandOps tracks goals, preferences, recurring actions, behavior, workflows, approved and
            rejected outputs, communication style, and scheduling habits.
          </p>
        </div>
        <span
          className={clsx(
            'rounded-full border px-2 py-1 text-fine font-semibold',
            readout.enabled
              ? 'border-success/45 bg-successSoft/20 text-success'
              : 'border-warning/45 bg-warningSoft/20 text-warning'
          )}
        >
          {readout.enabled ? 'Memory on' : 'Memory off'} · {readout.averageConfidence}% avg
        </span>
      </div>

      <p className="mt-3 rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2 text-meta leading-snug text-textMuted">
        {readout.headline} {readout.privacyPolicy}
      </p>
      <p className="mt-2 rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2 text-fine leading-snug text-textMuted">
        {readout.persistentStore}
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {Object.entries(readout.improvements).map(([surface, items]) => (
          <div key={surface} className="rounded-lg border border-border/35 bg-bgElevated/50 px-2.5 py-2">
            <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
              Improves {surface.replace('-', ' ')}
            </p>
            <p className="mt-1 line-clamp-3 text-fine leading-snug text-textMuted">
              {items.length ? items.join(' · ') : 'Waiting for more reviewed memory.'}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2">
        {categoryRows.map(([category, entries]) => (
          <div key={category} className="rounded-xl border border-border/35 bg-bgElevated/55 p-2.5">
            <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
              {CATEGORY_LABELS[category as MemoryContextCategory]}
            </p>
            <ul className="mt-2 grid gap-1.5">
              {entries.slice(0, 4).map((entry) => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-meta">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void runCommand(readout.controls.viewCommand)}
          className={clsx('rounded-lg border border-border/45 bg-surface/60 px-2.5 py-1.5 font-semibold text-text disabled:opacity-45', btnFocus)}
        >
          <Eye className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          View memory
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void runCommand(readout.controls.editCommand)}
          className={clsx('rounded-lg border border-border/45 bg-surface/60 px-2.5 py-1.5 font-semibold text-text disabled:opacity-45', btnFocus)}
        >
          <Pencil className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Edit memory
        </button>
        <button
          type="button"
          disabled={disabled || !onDeleteMemory}
          onClick={() => void onDeleteMemory?.()}
          className={clsx('rounded-lg border border-danger/40 bg-dangerSoft/15 px-2.5 py-1.5 font-semibold text-danger disabled:opacity-45', btnFocus)}
          title={readout.controls.deleteCommand}
        >
          <Trash2 className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Delete memory
        </button>
        <button
          type="button"
          disabled={disabled || !onDisableMemory || !readout.enabled}
          onClick={() => void onDisableMemory?.()}
          className={clsx('rounded-lg border border-warning/40 bg-warningSoft/20 px-2.5 py-1.5 font-semibold text-warning disabled:opacity-45', btnFocus)}
          title={readout.controls.disableCommand}
        >
          <Power className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Disable memory
        </button>
        <span className="rounded-lg border border-success/35 bg-successSoft/15 px-2.5 py-1.5 font-semibold text-success">
          <ShieldCheck className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Approval-gated
        </span>
      </div>
    </section>
  );
}

