import type { ReactNode } from 'react';
import clsx from 'clsx';
import { AlertCircle, CheckCircle2, Info, Loader2, Shield, Sparkles } from 'lucide-react';

export type DataOpsFeedbackTone = 'info' | 'success' | 'caution';

/** Map free-form copy to tone for icon and color (keeps setState as string in callers). */
export function parseDataOpsTone(message: string): DataOpsFeedbackTone {
  const m = message.toLowerCase();
  if (
    m.includes('fail') ||
    m.includes('error') ||
    m.includes('too large') ||
    m.includes('could not') ||
    m.startsWith('set vite_') ||
    m.includes('import failed') ||
    m.includes('export failed') ||
    m.includes('reset failed')
  ) {
    return 'caution';
  }
  if (
    m.includes('downloaded') ||
    m.includes('imported') ||
    m.includes('signed in') ||
    m.includes('active for launch') ||
    m.includes('reset to seed') ||
    m.includes('success')
  ) {
    return 'success';
  }
  if (m.includes('signed out')) return 'info';
  return 'info';
}

/**
 * Toasts the workspace data line in the app header: trust-forward, with tone, motion-safe.
 */
export function WorkspaceDataHint({ message, className }: { message: string; className?: string }) {
  const tone = parseDataOpsTone(message);
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'caution' ? AlertCircle : Info;
  const color =
    tone === 'success'
      ? 'border-success/35 bg-successSoft/20 text-success'
      : tone === 'caution'
        ? 'border-warning/40 bg-warningSoft/15 text-warning'
        : 'border-info/35 bg-infoSoft/15 text-info';

  return (
    <p
      className={clsx(
        'mt-1.5 flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] leading-snug bo-hint-appear',
        color,
        className
      )}
      role="status"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
      <span className="min-w-0 flex-1 text-textSoft [&_strong]:font-medium [&_strong]:text-text">
        {message}
      </span>
    </p>
  );
}

/** Reassuring lock-in for the shell header. */
export function OnDeviceTrustLine({ className }: { className?: string }) {
  return (
    <p
      className={clsx(
        'mt-0.5 flex max-w-sm items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-textSoft/90',
        className
      )}
    >
      <Shield className="h-2.5 w-2.5 text-textSoft" strokeWidth={2} aria-hidden />
      <span>Workspace data stays on this device</span>
    </p>
  );
}

/** Short reassurance under confirm dialogs (destructive, clear chat, reset). */
export function OnDeviceDialogTrustFooter({ className }: { className?: string }) {
  return (
    <p
      className={clsx(
        'mt-3 flex items-start gap-1.5 text-[10px] leading-snug text-textSoft',
        className
      )}
      role="note"
    >
      <Shield className="mt-0.5 h-3 w-3 shrink-0 text-textSoft/80" strokeWidth={2} aria-hidden />
      <span>Stays on this device. No network round-trip for this step.</span>
    </p>
  );
}

/**
 * Chat: premium loading state — perception of progress without a fake %.
 */
export function AgentWorkingState({ label = 'Agent is on it' }: { label?: string }) {
  return (
    <div
      className="bo-agent-working space-y-2 rounded-xl border border-border/50 bg-surface/50 p-3 shadow-sm backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primarySoft/20 text-primary">
          <Loader2
            className="h-4 w-4 motion-safe:animate-spin [animation-duration:700ms] [animation-timing-function:linear]"
            strokeWidth={2}
            aria-hidden
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-text">{label}</p>
          <p className="text-[10px] text-textSoft">
            Running your command and updating the workspace on-device.
          </p>
        </div>
        <Sparkles className="h-4 w-4 shrink-0 text-primary/70" strokeWidth={2} aria-hidden />
      </div>
      <div className="h-0.5 overflow-hidden rounded-full bg-border/40" aria-hidden>
        <div className="bo-indeterminate h-full w-1/3 rounded-full bg-primary/60" />
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  children,
  className
}: {
  title: string;
  body: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-dashed border-border/50 bg-bgSubtle/30 px-3 py-4 text-center',
        'bo-surface-enter',
        className
      )}
    >
      <p className="text-sm font-medium text-text">{title}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-textSoft">{body}</p>
      {children ? (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}
