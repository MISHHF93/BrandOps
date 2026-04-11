import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Command, Database, Search } from 'lucide-react';
import { BrandVaultPanel } from '../../modules/brandVault/BrandVaultPanel';
import { ContentLibraryPanel } from '../../modules/contentLibrary/ContentLibraryPanel';
import { OutreachWorkspacePanel } from '../../modules/outreachWorkspace/OutreachWorkspacePanel';
import { PublishingQueuePanel } from '../../modules/publishingQueue/PublishingQueuePanel';
import { PipelineCrmPanel } from '../../modules/pipelineCrm/PipelineCrmPanel';
import { BrandHeader } from '../../shared/ui/BrandHeader';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';
import { scheduler } from '../../services/scheduling/scheduler';
import { localIntelligence } from '../../services/intelligence/localIntelligence';

const ONBOARDING_KEY = 'brandops:onboarding-complete';

interface SearchResult {
  id: string;
  module: string;
  label: string;
  description: string;
  sectionId: string;
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <article className="bo-card space-y-1" aria-live="polite">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="text-2xl font-semibold text-slate-100">{value}</p>
      <p className="text-xs text-slate-400">{hint}</p>
    </article>
  );
}

const scrollToSection = (sectionId: string) => {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export function DashboardApp() {
  const {
    data,
    init,
    error,
    toggleFollowUp,
    snoozeSchedulerTask,
    completeSchedulerTask,
    exportWorkspace,
    addPublishingDraft,
    addOutreachDraft,
    addNote
  } = useBrandOpsStore();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    void init();
    setShowOnboarding(localStorage.getItem(ONBOARDING_KEY) !== 'yes');
  }, [init]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isMetaK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      const isSlash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey;
      if (isMetaK || isSlash) {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
      }

      if (event.key === '1' && event.altKey) scrollToSection('publishing-queue');
      if (event.key === '2' && event.altKey) scrollToSection('outreach-workspace');
      if (event.key === '3' && event.altKey) scrollToSection('pipeline-crm');
      if (event.key === 'Escape') setPaletteOpen(false);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const derived = useMemo(() => {
    if (!data) return null;

    const overdueFollowUps = data.followUps.filter(
      (item) => !item.completed && new Date(item.dueAt).getTime() < Date.now()
    ).length;

    const weightedPipeline = data.opportunities.reduce(
      (sum, item) => sum + item.valueUsd * (item.confidence / 100),
      0
    );

    const groups = scheduler.groups(data.scheduler);
    const contentPriority = localIntelligence.contentPriority(data.contentLibrary).slice(0, 3);
    const overdueRisk = localIntelligence.overdueRisk(data).slice(0, 4);
    const outreachUrgency = localIntelligence.outreachUrgency(data.outreachDrafts).slice(0, 3);
    const pipelineHealth = localIntelligence.pipelineHealth(data.opportunities).slice(0, 3);
    const publishingRecommendations = localIntelligence.publishingRecommendations(data.publishingQueue).slice(0, 3);

    return {
      overdueFollowUps,
      weightedPipeline,
      groups,
      contentPriority,
      overdueRisk,
      outreachUrgency,
      pipelineHealth,
      publishingRecommendations
    };
  }, [data]);

  const searchResults = useMemo(() => {
    if (!data) return [];
    const index: SearchResult[] = [
      ...data.publishingQueue.map((item) => ({
        id: item.id,
        module: 'Publishing Queue',
        label: item.title,
        description: item.body.slice(0, 100),
        sectionId: 'publishing-queue'
      })),
      ...data.outreachDrafts.map((item) => ({
        id: item.id,
        module: 'Outreach Workspace',
        label: `${item.targetName} · ${item.company}`,
        description: item.outreachGoal,
        sectionId: 'outreach-workspace'
      })),
      ...data.opportunities.map((item) => ({
        id: item.id,
        module: 'Pipeline CRM',
        label: `${item.name} · ${item.company}`,
        description: item.nextAction,
        sectionId: 'pipeline-crm'
      })),
      ...data.contentLibrary.map((item) => ({
        id: item.id,
        module: 'Content Library',
        label: item.title,
        description: item.goal,
        sectionId: 'content-library'
      })),
      ...data.brandVault.reusableSnippets.map((item, idx) => ({
        id: `vault-${idx}`,
        module: 'Brand Vault',
        label: 'Reusable snippet',
        description: item,
        sectionId: 'brand-vault'
      }))
    ];

    const query = searchQuery.trim().toLowerCase();
    if (!query) return index.slice(0, 8);
    return index
      .filter((item) => `${item.module} ${item.label} ${item.description}`.toLowerCase().includes(query))
      .slice(0, 12);
  }, [data, searchQuery]);

  if (error) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <section className="bo-card space-y-2" role="alert" aria-live="assertive">
          <h2 className="text-base font-semibold text-rose-300">Dashboard failed to load</h2>
          <p className="text-sm text-slate-300">{error}</p>
          <p className="text-xs text-slate-400">Try reloading this extension page from the browser extension manager.</p>
        </section>
      </main>
    );
  }

  if (!data || !derived) {
    return <div className="p-5" aria-busy="true">Loading BrandOps workspace…</div>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-5">
      <BrandHeader subtitle="Run publishing, outreach, and pipeline execution with transparent local intelligence helpers." />

      {showOnboarding ? (
        <section className="bo-card space-y-3" role="dialog" aria-label="BrandOps onboarding checklist">
          <h2 className="text-sm font-semibold">Welcome to BrandOps MVP</h2>
          <p className="text-xs text-slate-300">Set up the basics in 2 minutes, then run your daily workflow from one command surface.</p>
          <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-300">
            <li>Capture one content idea in Content Library.</li>
            <li>Schedule one post in Publishing Queue.</li>
            <li>Create one outreach draft and set a follow-up.</li>
            <li>Review one active opportunity in Pipeline CRM.</li>
          </ol>
          <button
            className="bo-link w-fit"
            onClick={() => {
              localStorage.setItem(ONBOARDING_KEY, 'yes');
              setShowOnboarding(false);
            }}
          >
            Finish onboarding
          </button>
        </section>
      ) : null}

      <section className="bo-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="relative min-w-[280px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-2 top-2.5 text-slate-500" />
            <input
              aria-label="Global search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Global search across publishing, outreach, CRM, content, and vault…"
              className="w-full rounded-lg border border-slate-700 bg-slate-950/55 py-2 pl-8 pr-3 text-xs"
            />
          </label>
          <button className="bo-link inline-flex items-center gap-1" onClick={() => setPaletteOpen(true)}>
            <Command size={12} /> Quick Actions
          </button>
        </div>
        <div className="space-y-2">
          {searchResults.length === 0 ? (
            <p className="rounded-lg border border-slate-800 bg-slate-950/45 p-2 text-xs text-slate-400">No matching items. Try a company name, post title, or tag.</p>
          ) : (
            searchResults.map((result) => (
              <button
                key={`${result.module}-${result.id}`}
                className="w-full rounded-lg border border-slate-800 bg-slate-950/45 p-2 text-left text-xs"
                onClick={() => scrollToSection(result.sectionId)}
              >
                <p className="font-medium">{result.label}</p>
                <p className="text-slate-400">{result.module} · {result.description || 'No description available'}</p>
              </button>
            ))
          )}
        </div>
      </section>

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

      <section className="bo-card space-y-3" id="intelligence-helpers" aria-label="Local intelligence helpers">
        <h2 className="text-sm font-semibold">Local intelligence helpers (rule-based, explainable)</h2>
        <p className="text-xs text-slate-400">Scores are simple heuristics from local data only. No external model APIs or hidden black-box inference.</p>
        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs">
            <p className="font-medium">Content priority scoring</p>
            {derived.contentPriority.map((item) => <p key={item.id} className="mt-1 text-slate-300">{item.label} — {item.score}/100 · {item.reason}</p>)}
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs">
            <p className="font-medium">Overdue risk scoring</p>
            {derived.overdueRisk.map((item) => <p key={item.id} className="mt-1 text-slate-300">{item.label} — {item.score}/100 · {item.reason}</p>)}
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs">
            <p className="font-medium">Outreach urgency ranking</p>
            {derived.outreachUrgency.map((item) => <p key={item.id} className="mt-1 text-slate-300">{item.label} — {item.score}/100 · {item.reason}</p>)}
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs">
            <p className="font-medium">Pipeline health + publishing recommendations</p>
            {derived.pipelineHealth.map((item) => <p key={item.id} className="mt-1 text-slate-300">{item.label} — Health {item.score}/100 · {item.reason}</p>)}
            {derived.publishingRecommendations.map((item) => <p key={item.title} className="mt-1 text-slate-400">• {item.title}: {item.rationale}</p>)}
          </article>
        </div>
      </section>

      <section className="bo-card space-y-3">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Reminder Engine</h2>
          <p className="text-xs text-slate-400">Local, browser-based reminders (best effort while browser is running).</p>
        </header>
        <div className="grid gap-2 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs"><p className="text-slate-400 uppercase tracking-[0.14em]">Due soon</p><p className="mt-1 text-lg font-semibold">{derived.groups.dueSoon.length}</p></div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs"><p className="text-slate-400 uppercase tracking-[0.14em]">Today</p><p className="mt-1 text-lg font-semibold">{derived.groups.today.length}</p></div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs"><p className="text-slate-400 uppercase tracking-[0.14em]">This week</p><p className="mt-1 text-lg font-semibold">{derived.groups.thisWeek.length}</p></div>
        </div>
        <div className="space-y-2">
          {[...derived.groups.dueSoon, ...derived.groups.missed].slice(0, 8).map((task) => (
            <article key={task.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs">
              <p className="text-sm font-medium">{task.title}</p>
              <p className="text-slate-400 mt-1">{task.sourceType.toUpperCase()} • Due {new Date(task.dueAt).toLocaleString()} • {task.status}</p>
              <p className="mt-1 text-slate-300">{task.detail}</p>
              <div className="mt-2 flex gap-2">
                <button className="bo-link !px-2 !py-1" onClick={() => void snoozeSchedulerTask(task.id, 15)}>Snooze 15m</button>
                <button className="bo-link !px-2 !py-1" onClick={() => void completeSchedulerTask(task.id)}>Complete</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="outreach-workspace"><OutreachWorkspacePanel /></section>
      <section id="publishing-queue"><PublishingQueuePanel /></section>
      <section id="pipeline-crm"><PipelineCrmPanel /></section>

      <section className="grid gap-3 xl:grid-cols-3">
        <article className="bo-card space-y-3">
          <header className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Follow-Up Scheduler</h2>
            {derived.overdueFollowUps > 0 ? <AlertTriangle size={14} className="text-amber-400" /> : <CheckCircle2 size={14} className="text-emerald-400" />}
          </header>
          {data.followUps.length === 0 ? <p className="text-xs text-slate-500">No follow-up tasks yet. Add one from Outreach or Popup quick actions.</p> : data.followUps.map((task) => (
            <button key={task.id} onClick={() => void toggleFollowUp(task.id)} className="w-full rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-left text-xs">
              <p className="font-medium text-sm">{task.reason}</p>
              <p className="mt-1 text-slate-400">Due: {new Date(task.dueAt).toLocaleString()}</p>
              <span className="bo-pill mt-2">{task.completed ? 'Completed' : 'Open'}</span>
            </button>
          ))}
        </article>

        <article className="bo-card space-y-3 xl:col-span-2">
          <header className="flex items-center justify-between"><h2 className="text-sm font-semibold">Pipeline Snapshot</h2><Database size={14} className="text-slate-400" /></header>
          <div className="grid gap-3 md:grid-cols-2">
            {data.opportunities.length === 0 ? <p className="text-xs text-slate-500">No opportunities yet. Create contacts and outreach drafts to populate the pipeline.</p> : data.opportunities.map((opp) => (
              <div key={opp.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs">
                <p className="text-sm font-medium">{opp.account ?? opp.company}</p>
                <p className="text-slate-400">{opp.serviceLine ?? opp.opportunityType}</p>
                <p className="mt-1">Stage: {opp.stage ?? opp.status}</p>
                <p>Next: {opp.nextAction}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section id="content-library"><ContentLibraryPanel /></section>
      <section id="brand-vault"><BrandVaultPanel /></section>

      {paletteOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/70 p-4" role="dialog" aria-label="Command palette">
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-3">
            <p className="text-xs text-slate-400">Quick actions · keyboard: Ctrl/Cmd+K, /, Alt+1/2/3</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <button className="bo-link" onClick={() => void addPublishingDraft({ title: 'Quick draft', body: 'Add your insight and refine before posting.' })}>New publishing draft</button>
              <button className="bo-link" onClick={() => void addOutreachDraft({ category: 'follow-up', targetName: data.contacts[0]?.name ?? 'Contact', company: data.contacts[0]?.company ?? 'Company', role: data.contacts[0]?.role ?? 'Role', messageBody: 'Quick follow-up from command palette.', outreachGoal: 'Book next step', tone: 'Clear and concise', notes: 'Created via command palette' })}>New outreach draft</button>
              <button className="bo-link" onClick={() => void addNote({ title: 'Quick note', detail: 'Capture one execution insight.' })}>Add note</button>
              <button className="bo-link" onClick={() => void (async () => { const payload = await exportWorkspace(); await navigator.clipboard.writeText(payload); })()}>Copy full workspace JSON</button>
            </div>
            <button className="bo-link mt-3 w-full" onClick={() => setPaletteOpen(false)}>Close</button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
