interface WelcomeSignedInSectionProps {
  primaryLabel: string | null;
  canContinue: boolean;
  optionsHref: string;
  onContinue: () => void;
}

export function WelcomeSignedInSection({
  primaryLabel,
  canContinue,
  optionsHref,
  onContinue
}: WelcomeSignedInSectionProps) {
  return (
    <div className="mt-8 space-y-5">
      {primaryLabel ? (
        <p className="rounded-xl border border-success/45 bg-successSoft/20 px-4 py-3 text-center text-sm text-text">
          <span className="font-medium">Signed in as </span>
          {primaryLabel}
        </p>
      ) : null}
      <button
        type="button"
        className="w-full rounded-lg bg-text px-4 py-3 text-center text-base font-semibold text-bg shadow-sm transition hover:bg-text/88 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!canContinue}
        onClick={() => void onContinue()}
      >
        Continue to BrandOps
      </button>
      <p className="text-center text-sm text-textMuted">
        <a
          className="font-medium text-primary hover:text-primaryHover underline-offset-2 hover:underline"
          href={optionsHref}
        >
          Manage connected accounts
        </a>
      </p>
    </div>
  );
}
