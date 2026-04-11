import { useEffect } from 'react';
import { ArrowUpRight, RefreshCcw } from 'lucide-react';
import { BrandHeader } from '../../shared/ui/BrandHeader';
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

  return (
    <main className="w-[430px] space-y-3 p-3">
      <BrandHeader subtitle="Local-first LinkedIn operating cockpit." />

      <section className="bo-card grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-semibold">{data.publishingQueue.length}</p>
          <p className="text-[11px] text-slate-400">Queue</p>
        </div>
        <div>
          <p className="text-lg font-semibold">{data.outreachDrafts.length}</p>
          <p className="text-[11px] text-slate-400">Outreach</p>
        </div>
        <div>
          <p className="text-lg font-semibold">{dueToday}</p>
          <p className="text-[11px] text-slate-400">Due soon</p>
        </div>
      </section>

      <section className="bo-card space-y-2">
        <p className="text-sm font-semibold">Quick actions</p>
        <button onClick={() => chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' })} className="bo-link w-full">
          Open Dashboard <ArrowUpRight className="ml-1 inline" size={12} />
        </button>
        <button onClick={() => chrome.runtime.openOptionsPage()} className="bo-link w-full">
          Open Settings <ArrowUpRight className="ml-1 inline" size={12} />
        </button>
        <button onClick={() => void resetDemoData()} className="bo-link w-full">
          <RefreshCcw className="mr-1 inline" size={12} /> Reset seed workspace
        </button>
      </section>
    </main>
  );
}
