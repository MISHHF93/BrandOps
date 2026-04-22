interface BrandHeaderProps {
  subtitle: string;
  title?: string;
  eyebrow?: string;
  showCrown?: boolean;
  /** Distinguishes surface intent: Capture (popup), Work (dashboard), Settings (integrations page). */
  roleBadge?: 'Capture' | 'Work' | 'Settings';
  /** Tighter header block and subtitle for cockpit compact density. */
  compact?: boolean;
}

export function BrandHeader({
  subtitle,
  title = 'Workspace',
  eyebrow = 'BrandOps',
  showCrown = false,
  roleBadge,
  compact
}: BrandHeaderProps) {
  return (
    <header
      className={`bo-card bo-retro-panel bo-retro-ambient w-full min-w-0 ${compact ? '!p-3' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="bo-pill">{eyebrow}</p>
            {roleBadge ? (
              <span className="rounded-lg border border-borderStrong bg-surface/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-textSoft">
                {roleBadge}
              </span>
            ) : null}
          </div>
          <h1 className={`${compact ? 'mt-2 text-base' : 'mt-3 text-lg'} font-semibold`}>{title}</h1>
          <p
            className={`mt-1 text-textMuted ${compact ? 'line-clamp-2 text-[11px] leading-snug' : 'text-xs'}`}
          >
            {subtitle}
          </p>
        </div>
        {showCrown ? (
          <div className="bo-header-crown rounded-xl border p-2">
            <img
              src="/brandops-crown.svg"
              alt="BrandOps crown"
              className="bo-header-crown__logo"
            />
          </div>
        ) : null}
      </div>
    </header>
  );
}
