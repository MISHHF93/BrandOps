import { useMemo, useState } from 'react';
import { ArchiveRestore, BellRing, KanbanSquare, List, TimerReset } from 'lucide-react';
import { OpportunityStage } from '../../types/domain';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';

const stages: OpportunityStage[] = ['prospect', 'discovery', 'proposal', 'negotiation', 'won', 'lost'];

type ViewMode = 'kanban' | 'list';

export function PipelineCrmPanel() {
  const { data, updateOpportunity, archiveOpportunity, restoreOpportunity } = useBrandOpsStore();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string>('');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<'followUpDate' | 'updatedAt' | 'valueUsd'>('followUpDate');
  const [filterType, setFilterType] = useState<'all' | string>('all');

  const opportunityItems = useMemo(() => {
    if (!data) return [];

    return data.opportunities
      .filter((item) => (showArchived ? Boolean(item.archivedAt) : !item.archivedAt))
      .filter((item) => filterType === 'all' || item.opportunityType === filterType)
      .sort((a, b) => {
        if (sortBy === 'valueUsd') return b.valueUsd - a.valueUsd;
        return new Date(a[sortBy]).getTime() - new Date(b[sortBy]).getTime();
      });
  }, [data, filterType, showArchived, sortBy]);

  const reminders = useMemo(() => {
    const now = Date.now();
    return opportunityItems
      .filter((item) => item.status !== 'won' && item.status !== 'lost')
      .filter((item) => new Date(item.followUpDate).getTime() <= now + 48 * 60 * 60 * 1000)
      .slice(0, 5);
  }, [opportunityItems]);

  const selectedOpportunity = opportunityItems.find((item) => item.id === selectedOpportunityId) ?? opportunityItems[0];
  const selectedContact = data?.contacts.find((item) => item.id === selectedContactId) ?? data?.contacts[0];

  if (!data) return null;

  return (
    <section className="bo-card space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Pipeline CRM</h2>
        <div className="flex gap-2 text-xs">
          <button className="bo-link inline-flex items-center gap-1" onClick={() => setViewMode('kanban')}>
            <KanbanSquare size={12} /> Kanban
          </button>
          <button className="bo-link inline-flex items-center gap-1" onClick={() => setViewMode('list')}>
            <List size={12} /> List
          </button>
        </div>
      </header>

      <div className="grid gap-2 md:grid-cols-4">
        <select className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All opportunity types</option>
          {Array.from(new Set(data.opportunities.map((item) => item.opportunityType))).map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <select className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'followUpDate' | 'updatedAt' | 'valueUsd')}>
          <option value="followUpDate">Sort: Follow-up date</option>
          <option value="updatedAt">Sort: Last updated</option>
          <option value="valueUsd">Sort: Value</option>
        </select>
        <button className="bo-link" onClick={() => setShowArchived((prev) => !prev)}>
          <ArchiveRestore size={12} className="mr-1 inline" /> {showArchived ? 'Show active' : 'Show archived'}
        </button>
      </div>

      {viewMode === 'kanban' ? (
        <div className="grid gap-2 xl:grid-cols-6">
          {stages.map((stage) => (
            <div key={stage} className="rounded-xl border border-slate-800 bg-slate-950/40 p-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-slate-400">{stage}</p>
              <div className="mt-2 space-y-2">
                {opportunityItems.filter((item) => item.status === stage).map((item) => (
                  <button
                    key={item.id}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-left text-xs"
                    onClick={() => setSelectedOpportunityId(item.id)}
                  >
                    <p className="font-medium text-slate-100">{item.name}</p>
                    <p className="text-slate-400">{item.company}</p>
                    <p className="text-slate-500">Next: {item.nextAction}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {opportunityItems.map((item) => (
            <button
              key={item.id}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-left text-xs"
              onClick={() => setSelectedOpportunityId(item.id)}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{item.name}</p>
                <span className="bo-pill">{item.status}</span>
              </div>
              <p className="text-slate-400">{item.company} · {item.opportunityType}</p>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-3">
        <article className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs xl:col-span-2">
          <h3 className="text-sm font-semibold">Opportunity detail</h3>
          {selectedOpportunity ? (
            <div className="mt-2 space-y-2">
              <p className="text-slate-300">{selectedOpportunity.company} · {selectedOpportunity.role}</p>
              <p className="text-slate-400">{selectedOpportunity.notes}</p>
              <p>Follow-up: {new Date(selectedOpportunity.followUpDate).toLocaleString()}</p>
              <label className="block">
                <span className="text-slate-400">Status</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
                  value={selectedOpportunity.status}
                  onChange={(event) => void updateOpportunity(selectedOpportunity.id, { status: event.target.value as OpportunityStage })}
                >
                  {stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                </select>
              </label>
              <div className="flex gap-2">
                <button className="bo-link" onClick={() => void archiveOpportunity(selectedOpportunity.id)}>Archive</button>
                <button className="bo-link" onClick={() => void restoreOpportunity(selectedOpportunity.id)}>
                  <TimerReset size={12} className="mr-1 inline" /> Restore
                </button>
              </div>
            </div>
          ) : <p className="mt-2 text-slate-500">No opportunity selected.</p>}
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs">
          <h3 className="text-sm font-semibold">Contact detail</h3>
          <select className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 p-2" value={selectedContact?.id ?? ''} onChange={(e) => setSelectedContactId(e.target.value)}>
            {data.contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>{contact.name}</option>
            ))}
          </select>
          {selectedContact ? (
            <div className="mt-2 space-y-1 text-slate-300">
              <p>{selectedContact.company}</p>
              <p>{selectedContact.role}</p>
              <p className="text-slate-400">Next: {selectedContact.nextAction}</p>
              <p className="text-slate-500">Follow-up: {selectedContact.followUpDate ? new Date(selectedContact.followUpDate).toLocaleDateString() : 'Not set'}</p>
            </div>
          ) : null}
        </article>
      </div>

      <article className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs">
        <h3 className="inline-flex items-center gap-1 text-sm font-semibold"><BellRing size={13} /> Follow-up reminders</h3>
        <div className="mt-2 space-y-2">
          {reminders.map((item) => (
            <p key={item.id} className="rounded-lg border border-slate-800 bg-slate-950 p-2">
              {item.name} — {new Date(item.followUpDate).toLocaleString()}
            </p>
          ))}
          {reminders.length === 0 ? <p className="text-slate-500">No reminders due in the next 48 hours.</p> : null}
        </div>
      </article>

      <article className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs">
        <h3 className="text-sm font-semibold">Recent activity timeline</h3>
        <div className="mt-2 space-y-2">
          {data.notes
            .slice()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 6)
            .map((note) => (
              <div key={note.id} className="rounded-lg border border-slate-800 bg-slate-950 p-2">
                <p className="font-medium">{note.title}</p>
                <p className="text-slate-400">{note.detail}</p>
              </div>
            ))}
        </div>
      </article>
    </section>
  );
}
