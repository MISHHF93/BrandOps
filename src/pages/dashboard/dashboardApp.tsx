import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Database, Target } from 'lucide-react';
import { BrandVaultPanel } from '../../modules/brandVault/BrandVaultPanel';
import { ContentLibraryPanel } from '../../modules/contentLibrary/ContentLibraryPanel';
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
    addPublishingDraft,
    updatePublishingStatus,
    addOutreachDraft,
    toggleFollowUp
  } = useBrandOpsStore();
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');

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

      <section className="grid gap-3 xl:grid-cols-2">
        <article className="bo-card space-y-3">
          <header className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Publishing Queue</h2>
            <Clock3 size={14} className="text-slate-400" />
          </header>

          <div className="space-y-2">
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="Post title"
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
            />
            <textarea
              value={draftBody}
              onChange={(event) => setDraftBody(event.target.value)}
              placeholder="Paste LinkedIn post content"
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
            />
            <button
              onClick={() => {
                if (!draftTitle.trim() || !draftBody.trim()) return;
                void addPublishingDraft({ title: draftTitle.trim(), body: draftBody.trim() });
                setDraftTitle('');
                setDraftBody('');
              }}
              className="bo-link"
            >
              Save draft
            </button>
          </div>

          <div className="space-y-2">
            {data.publishingQueue.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm"
              >
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{item.body}</p>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="bo-pill">{item.status}</span>
                  <button
                    className="bo-link px-2 py-1 text-[11px]"
                    onClick={() =>
                      void updatePublishingStatus(
                        item.id,
                        item.status === 'ready' ? 'scheduled' : 'ready'
                      )
                    }
                  >
                    {item.status === 'ready' ? 'Schedule' : 'Mark ready'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="bo-card space-y-3">
          <header className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Outreach Workspace</h2>
            <Target size={14} className="text-slate-400" />
          </header>

          <button
            className="bo-link"
            onClick={() =>
              void addOutreachDraft({
                contactId: data.contacts[0]?.id ?? 'unknown',
                subject: 'New outreach touchpoint',
                message: 'Sharing a concise systems teardown tailored to your current initiative.'
              })
            }
          >
            Add outreach draft
          </button>

          <div className="space-y-2">
            {data.outreachDrafts.map((draft) => {
              const contact = data.contacts.find((item) => item.id === draft.contactId);
              return (
                <div
                  key={draft.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm"
                >
                  <p className="font-medium">{draft.subject}</p>
                  <p className="text-xs text-slate-400">{contact?.fullName ?? 'Unknown contact'}</p>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">{draft.message}</p>
                </div>
              );
            })}
          </div>
        </article>
      </section>

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
