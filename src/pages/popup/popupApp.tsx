import { useEffect, useMemo } from 'react';
import { CirclePlus, Clock3, LifeBuoy, MessageSquarePlus, RefreshCcw, UserPlus } from 'lucide-react';
import { BrandHeader } from '../../shared/ui/BrandHeader';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';

export function PopupApp() {
  const {
    data,
    init,
    resetDemoData,
    addPublishingDraft,
    updatePublishingStatus,
    addOutreachDraft,
    addContact,
    logFollowUp,
    addNote
  } = useBrandOpsStore();

  useEffect(() => {
    void init();
  }, [init]);

  const derived = useMemo(() => {
    if (!data) return null;

    const now = Date.now();
    const next72Hours = now + 72 * 60 * 60 * 1000;
    const next24Hours = now + 24 * 60 * 60 * 1000;
    const upcomingScheduledPosts = data.publishingQueue.filter(
      (item) => item.reminderAt && new Date(item.reminderAt).getTime() <= next72Hours
    ).length;
    const pendingOutreachTasks = data.outreachDrafts.filter((item) => item.status !== 'sent').length;
    const followUpsSoon = data.followUps.filter(
      (item) => !item.completed && new Date(item.dueAt).getTime() <= next24Hours
    ).length;
    const activeOpportunities = data.opportunities.filter(
      (item) => item.stage !== 'won' && item.stage !== 'lost'
    ).length;
    const savedDrafts = data.publishingQueue.filter((item) => item.status !== 'posted').length;
    const recentNotes = data.notes.slice(0, 3);

    const timeline = [
      ...data.publishingQueue.map((item) => ({
        id: `pub-${item.id}`,
        label: item.title,
        type: 'post' as const,
        time: item.reminderAt ?? item.createdAt
      })),
      ...data.outreachDrafts.map((item) => ({
        id: `out-${item.id}`,
        label: item.subject,
        type: 'outreach' as const,
        time: item.scheduledFor ?? new Date().toISOString()
      })),
      ...data.followUps.map((item) => ({
        id: `fu-${item.id}`,
        label: item.reason,
        type: 'follow-up' as const,
        time: item.dueAt
      })),
      ...data.notes.map((item) => ({
        id: `note-${item.id}`,
        label: item.title,
        type: 'note' as const,
        time: item.createdAt
      }))
    ]
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      .slice(0, 5);

    return {
      upcomingScheduledPosts,
      pendingOutreachTasks,
      followUpsSoon,
      activeOpportunities,
      savedDrafts,
      recentNotes,
      timeline
    };
  }, [data]);

  if (!data || !derived) {
    return <div className="w-[430px] p-4 text-sm">Initializing BrandOps command center…</div>;
  }

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
      <BrandHeader subtitle="Daily operating command center for publishing, outreach, and pipeline execution." />

      <section className="bo-card space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Command overview
          </h2>
          <button onClick={() => openModule('dashboard')} className="bo-link px-2 py-1 text-[11px]">
            Expand
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-left">
          {[
            ['Upcoming scheduled posts', derived.upcomingScheduledPosts],
            ['Pending outreach tasks', derived.pendingOutreachTasks],
            ['Follow-ups due soon', derived.followUpsSoon],
            ['Active opportunities', derived.activeOpportunities],
            ['Saved content drafts', derived.savedDrafts],
            ['Recent notes', data.notes.length]
          ].map(([label, value]) => (
            <article key={label} className="rounded-xl border border-slate-800/80 bg-slate-950/55 p-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-slate-400">{label}</p>
              <p className="mt-1 text-xl font-semibold">{value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bo-card space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Quick actions</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() =>
              void addPublishingDraft({
                title: 'New draft: operating insight',
                body: 'Capture one operating insight from today and convert it into a concise authority post.'
              })
            }
            className="bo-link"
          >
            <CirclePlus size={12} className="mr-1 inline" />
            Add post draft
          </button>
          <button
            onClick={() => {
              const ready = data.publishingQueue.find(
                (item) => item.status === 'ready-to-post' || item.status === 'due-soon'
              );
              if (ready) void updatePublishingStatus(ready.id, 'queued');
            }}
            className="bo-link"
          >
            <Clock3 size={12} className="mr-1 inline" />
            Schedule post
          </button>
          <button
            onClick={() =>
              void addOutreachDraft({
                contactId: data.contacts[0]?.id ?? 'unknown',
                subject: 'New outreach draft',
                message: 'Sharing a compact teardown that maps your current workflow to faster execution.'
              })
            }
            className="bo-link"
          >
            <MessageSquarePlus size={12} className="mr-1 inline" />
            Create outreach draft
          </button>
          <button
            onClick={() =>
              void addContact({
                fullName: 'Jordan Rivera',
                title: 'Revenue Operations Lead',
                company: 'Summit Grid'
              })
            }
            className="bo-link"
          >
            <UserPlus size={12} className="mr-1 inline" />
            Add contact
          </button>
          <button
            onClick={() =>
              void logFollowUp({
                contactId: data.contacts[0]?.id ?? 'unknown',
                reason: 'Send short check-in with available discovery slots.',
                dueAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
              })
            }
            className="bo-link col-span-2"
          >
            <Clock3 size={12} className="mr-1 inline" />
            Log follow-up
          </button>
        </div>
      </section>

      <section className="bo-card space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Activity timeline
        </h2>
        <div className="space-y-2">
          {derived.timeline.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-800/80 bg-slate-950/45 p-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <p className="line-clamp-1 font-medium text-slate-100">{item.label}</p>
                <span className="bo-pill !px-2 !py-0.5">{item.type}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">{new Date(item.time).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bo-card space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Recent notes</h2>
        <div className="space-y-2">
          {derived.recentNotes.map((note) => (
            <div key={note.id} className="rounded-xl border border-slate-800/80 bg-slate-950/45 p-2 text-xs">
              <p className="font-medium text-slate-100">{note.title}</p>
              <p className="mt-1 line-clamp-2 text-slate-400">{note.detail}</p>
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            void addNote({
              title: 'New operating note',
              detail: 'Capture one improvement from today and convert it into tomorrow’s outreach angle.'
            })
          }
          className="bo-link w-full"
        >
          <CirclePlus className="mr-1 inline" size={12} /> Add quick note
        </button>
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
