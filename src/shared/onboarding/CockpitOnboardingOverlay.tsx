interface CockpitOnboardingOverlayProps {
  onContinue: () => void;
}

export function CockpitOnboardingOverlay({ onContinue }: CockpitOnboardingOverlayProps) {
  return (
    <div
      className="bo-system-overlay fixed inset-0 z-50 flex min-h-0 items-center justify-center overflow-y-auto p-4"
      role="presentation"
    >
      <section
        className="bo-system-sheet w-full max-w-2xl space-y-3 rounded-3xl border p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bo-onboarding-title"
      >
        <h2 id="bo-onboarding-title" className="text-sm font-semibold">
          Welcome to your BrandOps cockpit
        </h2>
        <p className="text-xs text-textMuted">
          Take two minutes to shape the workspace around your real weekly rhythm before you start
          stuffing it with more tools.
        </p>
        <article className="rounded-xl border border-border bg-bg/45 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-textSoft">Operating philosophy</p>
          <p className="mt-2 text-xs text-textMuted">
            BrandOps is a daily operator cockpit. It does not replace thinking; it organizes and
            amplifies it.
          </p>
          <p className="mt-2 text-xs text-textMuted">
            Visibility over automation · Structure over chaos · Execution over intention · Clarity
            over abstraction
          </p>
        </article>
        <ol className="list-decimal space-y-1 pl-5 text-xs text-textMuted">
          <li>
            Finish this checklist, then you will be prompted to set your operator profile (or skip).
          </li>
          <li>
            Use Pipeline and Brand & content for outreach, pipeline, library, publishing, and brand
            vault — they are areas here, not separate products.
          </li>
          <li>Optional: open Settings → Integrations when you want LinkedIn identity connected.</li>
          <li>Execute Publishing Queue: copy post, publish manually, and mark completed.</li>
          <li>Run Outreach and Pipeline: log sends, move opportunities, schedule follow-ups.</li>
        </ol>
        <p className="text-xs text-textMuted">
          Optional LinkedIn sign-in is configured in{' '}
          <span className="font-medium text-text">Settings → Integrations</span> — not on this
          screen, so you only connect OAuth once in the right place.
        </p>
        <button type="button" className="bo-link w-fit mt-1" onClick={onContinue}>
          Continue
        </button>
      </section>
    </div>
  );
}
