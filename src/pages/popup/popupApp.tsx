import { useEffect } from 'react';
import { ArrowUpRight, RefreshCcw } from 'lucide-react';
import { BrandHeader } from '../../shared/ui/BrandHeader';
import { ModuleCard } from '../../shared/ui/ModuleCard';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';

export function PopupApp() {
  const { data, init, resetDemoData } = useBrandOpsStore();

  useEffect(() => {
    void init();
  }, [init]);

  if (!data) {
    return <div className="w-[420px] p-4 text-sm">Initializing BrandOps workspace…</div>;
  }

  return (
    <main className="w-[420px] space-y-3 p-3">
      <BrandHeader subtitle="Operate your personal brand like a product with premium workflows." />

      <section className="grid grid-cols-1 gap-2">
        {data.modules.map((module) => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </section>

      <section className="bo-card space-y-2">
        <p className="text-sm font-semibold">Quick navigation</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' })} className="bo-link">
            Open Dashboard <ArrowUpRight className="ml-1 inline" size={12} />
          </button>
          <button onClick={() => chrome.runtime.openOptionsPage()} className="bo-link">
            Open Settings <ArrowUpRight className="ml-1 inline" size={12} />
          </button>
        </div>
        <button onClick={() => void resetDemoData()} className="bo-link w-full">
          <RefreshCcw className="mr-1 inline" size={12} /> Reset demo seed data
        </button>
      </section>
    </main>
  );
}
