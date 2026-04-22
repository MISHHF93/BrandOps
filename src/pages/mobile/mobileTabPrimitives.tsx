import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function mobileChipClass(btnFocus: string) {
  return `rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2.5 py-1.5 text-left text-xs text-zinc-200 ${btnFocus}`;
}

export function MobileTabSection({
  id,
  title,
  description,
  children
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-xl border border-white/10 bg-zinc-950/40 p-3 text-xs text-zinc-300"
      aria-labelledby={id}
    >
      <h3 id={id} className="text-sm font-semibold text-zinc-100">
        {title}
      </h3>
      {description ? <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">{description}</p> : null}
      {children}
    </section>
  );
}

export function MobileTabPageHeader({
  title,
  subtitle,
  icon: Icon,
  iconWrapperClassName,
  iconClassName
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconWrapperClassName: string;
  iconClassName: string;
}) {
  return (
    <header className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className={iconWrapperClassName}>
          <Icon className={`h-5 w-5 ${iconClassName}`} aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-50">{title}</h2>
          <p className="text-[11px] text-zinc-500">{subtitle}</p>
        </div>
      </div>
    </header>
  );
}
