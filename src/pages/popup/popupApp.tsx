import { useEffect } from 'react';
import { LifeBuoy, RefreshCcw } from 'lucide-react';
import { BrandHeader } from '../../shared/ui/BrandHeader';
import { ModuleCard } from '../../shared/ui/ModuleCard';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';

export function PopupApp() {
  const { data, init, resetDemoData } = useBrandOpsStore();

  useEffect(() => {
    void init();
  }, [init]);

  if (!data) {
    return <div className="w-[430px] p-4 text-sm">Initializing BrandOps command center…</div>;
  }

  const dueToday = data.followUps.filter(
    (item) => !item.completed && new Date(item.dueAt).getTime() <= Date.now() + 24 * 60 * 60 * 1000
  ).length;

  const openModule = (route: 'popup' | 'dashboard' | 'options' | 'content') => {
    if (route === 'options') {
      void chrome.runtime.openOptionsPage();
      return;
    }

    if (route === 'dashboard') {
      void chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
      return;
    }
  };

  return (
    <main className="w-[430px] space-y-3 p-3">
      <BrandHeader subtitle="Premium local-first extension for modern brand operations." />

      <section className="bo-card grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-semibold">{data.publishingQueue.length}</p>
          <p className="text-[11px] text-slate-400">In queue</p>
        </div>
        <div>
          <p className="text-lg font-semibold">{data.outreachDrafts.length}</p>
          <p className="text-[11px] text-slate-400">Outreach</p>
        </div>
        <div>
          <p className="text-lg font-semibold">{dueToday}</p>
          <p className="text-[11px] text-slate-400">Due today</p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Modules
        </h2>
        <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {data.modules.map((module) => (
            <ModuleCard key={module.id} module={module} onOpen={() => openModule(module.route)} />
          ))}
        </div>
      </section>

      <section className="bo-card space-y-2">
        <button onClick={() => void resetDemoData()} className="bo-link w-full">
          <RefreshCcw className="mr-1 inline" size={12} /> Reload demo dataset
        </button>
        <button onClick={() => void chrome.runtime.openOptionsPage()} className="bo-link w-full">
          <LifeBuoy className="mr-1 inline" size={12} /> Workspace settings
        </button>
      </section>
    </main>
  );
}
