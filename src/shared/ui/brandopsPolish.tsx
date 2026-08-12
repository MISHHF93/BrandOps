import clsx from 'clsx';
import { AlertCircle, CheckCircle2, Info, Shield } from 'lucide-react';

type DataOpsFeedbackTone = 'info' | 'success' | 'caution';

/** Official BrandOps mark. The legacy component name stays stable for existing call sites. */
export function BrandOpsCrownMark({ className }: { className?: string }) {
  return <img src="/branding/brandops-logo.png" alt="" aria-hidden="true" className={className} />;
}

export function BrandOpsMarkBadge({
  className,
  markClassName
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={clsx('bo-brand-mark', className)} aria-hidden>
      <BrandOpsCrownMark className={clsx('bo-brand-mark__logo', markClassName)} />
    </span>
  );
}

/** Map free-form copy to tone for icon and color (keeps setState as string in callers). */
function parseDataOpsTone(message: string): DataOpsFeedbackTone {
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
        'mt-1.5 flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-fine leading-snug bo-hint-appear',
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
        'mt-0.5 flex max-w-sm items-center gap-1 text-overline uppercase tracking-wide text-textSoft/90',
        className
      )}
    >
      <Shield className="h-3 w-3 text-textSoft" strokeWidth={2} aria-hidden />
      <span>Workspace storage is local by default</span>
    </p>
  );
}

/** Short reassurance under confirm dialogs (destructive, clear chat, reset). */
export function OnDeviceDialogTrustFooter({ className }: { className?: string }) {
  return (
    <p
      className={clsx(
        'mt-3 flex items-start gap-1.5 text-fine leading-snug text-textSoft',
        className
      )}
      role="note"
    >
      <Shield className="mt-0.5 h-3 w-3 shrink-0 text-textSoft/80" strokeWidth={2} aria-hidden />
      <span>Stays on this device. No network round-trip for this step.</span>
    </p>
  );
}
