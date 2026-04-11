export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">{title}</h2>
      {subtitle ? <p className="text-xs text-slate-400">{subtitle}</p> : null}
    </header>
  );
}
