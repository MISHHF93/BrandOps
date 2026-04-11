import { Crown } from 'lucide-react';

interface BrandHeaderProps {
  subtitle: string;
}

export function BrandHeader({ subtitle }: BrandHeaderProps) {
  return (
    <header className="bo-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="bo-pill">BrandOps • Premium</p>
          <h1 className="mt-3 text-lg font-semibold">Command Surface</h1>
          <p className="mt-1 text-xs text-slate-300">{subtitle}</p>
        </div>
        <div
          className="rounded-xl border p-2"
          style={{
            borderColor: 'hsl(var(--bo-primary) / 0.45)',
            backgroundColor: 'hsl(var(--bo-primary) / 0.12)'
          }}
        >
          <Crown size={16} />
        </div>
      </div>
    </header>
  );
}
