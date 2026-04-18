export function StatCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <article className="bo-card space-y-1" aria-live="polite">
      <p className="text-xs uppercase tracking-[0.16em] text-textMuted">{label}</p>
      <p className="text-2xl font-semibold text-text">{value}</p>
      <p className="text-xs text-textMuted">{hint}</p>
    </article>
  );
}
