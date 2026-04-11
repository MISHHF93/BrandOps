import { useEffect, useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Database } from 'lucide-react';
import { BrandVaultPanel } from '../../modules/brandVault/BrandVaultPanel';
import { ContentLibraryPanel } from '../../modules/contentLibrary/ContentLibraryPanel';
import { OutreachWorkspacePanel } from '../../modules/outreachWorkspace/OutreachWorkspacePanel';
import { PublishingQueuePanel } from '../../modules/publishingQueue/PublishingQueuePanel';
import { BrandHeader } from '../../shared/ui/BrandHeader';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';

function StatCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <article className="bo-card space-y-1">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="text-2xl font-semibold text-slate-100">{value}</p>
      <p className="text-xs text-slate-400">{hint}</p>
    </article>
  );
}

export function DashboardApp() {
  const {
    data,
    init,
    toggleFollowUp
  } = useBrandOpsStore();

  useEffect(() => {
    void init();
  }, [init]);

  const derived = useMemo(() => {
    if (!data) return null;

    const overdueFollowUps = data.followUps.filter(
      (item) => !item.completed && new Date(item.dueAt).getTime() < Date.now()
    ).length;

    const weightedPipeline = data.opportunities.reduce(
      (sum, item) => sum + item.valueUsd * (item.confidence / 100),
      0
    );

    return {
      overdueFollowUps,
      weightedPipeline
    };
  }, [data]);

  if (!data || !derived) {
    return <div className="p-5">Loading dashboard…</div>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-5">
      <BrandHeader subtitle="BrandOps command center: scheduling, outreach, and opportunity execution." />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Publishing queue"
          value={data.publishingQueue.length}
          hint="Drafts + scheduled reminders"
        />
        <StatCard
          label="Outreach drafts"
          value={data.outreachDrafts.length}
          hint="Prepared touchpoints"
        />
        <StatCard
          label="Weighted pipeline"
          value={`$${Math.round(derived.weightedPipeline).toLocaleString()}`}
          hint="Confidence adjusted"
        />
        <StatCard
          label="Overdue follow-ups"
          value={derived.overdueFollowUps}
          hint="Needs execution today"
        />
      </section>

      <OutreachWorkspacePanel />

      <PublishingQueuePanel />

      <section className="grid gap-3 xl:grid-cols-3">
        <article className="bo-card space-y-3">
          <header className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Follow-Up Scheduler</h2>
            {derived.overdueFollowUps > 0 ? (
              <AlertTriangle size={14} className="text-amber-400" />
            ) : (
              <CheckCircle2 size={14} className="text-emerald-400" />
            )}
          </header>

          {data.followUps.map((task) => (
            <button
              key={task.id}
              onClick={() => void toggleFollowUp(task.id)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-left text-xs"
            >
              <p className="font-medium text-sm">{task.reason}</p>
              <p className="mt-1 text-slate-400">Due: {new Date(task.dueAt).toLocaleString()}</p>
              <span className="bo-pill mt-2">{task.completed ? 'Completed' : 'Open'}</span>
            </button>
          ))}
        </article>

        <article className="bo-card space-y-3 xl:col-span-2">
          <header className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Pipeline Snapshot</h2>
            <Database size={14} className="text-slate-400" />
          </header>

          <div className="grid gap-3 md:grid-cols-2">
            {data.opportunities.map((opp) => (
              <div key={opp.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs">
                <p className="text-sm font-medium">{opp.account}</p>
                <p className="text-slate-400">{opp.serviceLine}</p>
                <p className="mt-1">Stage: {opp.stage}</p>
                <p>Next: {opp.nextAction}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <ContentLibraryPanel />

      <BrandVaultPanel />
    </main>
  );
}
