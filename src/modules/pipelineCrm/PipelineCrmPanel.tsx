import { useEffect, useMemo, useState } from 'react';
import { ArchiveRestore, BellRing, Copy, KanbanSquare, List, TimerReset } from 'lucide-react';
import { OpportunityStage } from '../../types/domain';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';
import { ConfirmDialog } from '../../shared/ui/components';

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
  const [notice, setNotice] = useState<string | null>(null);
  const [archiveOpportunityId, setArchiveOpportunityId] = useState<string | null>(null);

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

  const urgentOpportunity = reminders[0] ?? opportunityItems[0];
  const selectedOpportunity =
    opportunityItems.find((item) => item.id === selectedOpportunityId) ?? opportunityItems[0];
  const selectedContact =
    data?.contacts.find((item) => item.id === selectedContactId) ?? data?.contacts[0];
  const selectedOrUrgentOpportunity = selectedOpportunity ?? urgentOpportunity;

  const copyOpportunityBrief = () => {
    if (!selectedOrUrgentOpportunity) {
      setNotice('No opportunity available to copy.');
      return;
    }

    const opportunityBrief = [
      `Opportunity: ${selectedOrUrgentOpportunity.name}`,
      `Company: ${selectedOrUrgentOpportunity.company}`,
      `Stage: ${selectedOrUrgentOpportunity.status}`,
      `Next action: ${selectedOrUrgentOpportunity.nextAction}`,
      `Follow-up: ${new Date(selectedOrUrgentOpportunity.followUpDate).toLocaleString()}`
    ].join('\n');

    void navigator.clipboard.writeText(opportunityBrief);
    setNotice(`Copied brief for ${selectedOrUrgentOpportunity.name}.`);
  };

  const focusUrgentOpportunity = () => {
    if (!urgentOpportunity) {
      setNotice('No urgent opportunity available right now.');
      return;
    }
    setSelectedOpportunityId(urgentOpportunity.id);
    setNotice(`Focused ${urgentOpportunity.name}.`);
  };

  const snoozeSelectedOpportunity = () => {
    if (!selectedOrUrgentOpportunity) {
      setNotice('No opportunity selected to snooze.');
      return;
    }

    const currentFollowUp = new Date(selectedOrUrgentOpportunity.followUpDate).getTime();
    const nextFollowUpIso = new Date(
      (Number.isFinite(currentFollowUp) ? currentFollowUp : Date.now()) + 24 * 60 * 60 * 1000
    ).toISOString();

    void updateOpportunity(selectedOrUrgentOpportunity.id, { followUpDate: nextFollowUpIso });
    setNotice(`Follow-up moved +1 day for ${selectedOrUrgentOpportunity.name}.`);
  };

  const copySelectedContactSummary = () => {
    if (!selectedContact) {
      setNotice('No contact selected to copy.');
      return;
    }

    const summary = [
      `Contact: ${selectedContact.name}`,
      `Company: ${selectedContact.company}`,
      `Role: ${selectedContact.role}`,
      `Next action: ${selectedContact.nextAction}`,
      `Follow-up: ${
        selectedContact.followUpDate
          ? new Date(selectedContact.followUpDate).toLocaleDateString()
          : 'Not set'
      }`
    ].join('\n');
    void navigator.clipboard.writeText(summary);
    setNotice(`Copied contact summary for ${selectedContact.name}.`);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true;
      if (isTyping || !(event.metaKey || event.ctrlKey) || !event.shiftKey) return;

      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        if (!selectedOrUrgentOpportunity) {
          setNotice('No opportunity available to copy.');
          return;
        }
        const opportunityBrief = [
          `Opportunity: ${selectedOrUrgentOpportunity.name}`,
          `Company: ${selectedOrUrgentOpportunity.company}`,
          `Stage: ${selectedOrUrgentOpportunity.status}`,
          `Next action: ${selectedOrUrgentOpportunity.nextAction}`,
          `Follow-up: ${new Date(selectedOrUrgentOpportunity.followUpDate).toLocaleString()}`
        ].join('\n');
        void navigator.clipboard.writeText(opportunityBrief);
        setNotice(`Copied brief for ${selectedOrUrgentOpportunity.name}.`);
      }
      if (event.key.toLowerCase() === 'j') {
        event.preventDefault();
        if (!urgentOpportunity) {
          setNotice('No urgent opportunity available right now.');
          return;
        }
        setSelectedOpportunityId(urgentOpportunity.id);
        setNotice(`Focused ${urgentOpportunity.name}.`);
      }
      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        if (!selectedOrUrgentOpportunity) {
          setNotice('No opportunity selected to snooze.');
          return;
        }
        const currentFollowUp = new Date(selectedOrUrgentOpportunity.followUpDate).getTime();
        const nextFollowUpIso = new Date(
          (Number.isFinite(currentFollowUp) ? currentFollowUp : Date.now()) + 24 * 60 * 60 * 1000
        ).toISOString();
        void updateOpportunity(selectedOrUrgentOpportunity.id, { followUpDate: nextFollowUpIso });
        setNotice(`Follow-up moved +1 day for ${selectedOrUrgentOpportunity.name}.`);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedOrUrgentOpportunity, updateOpportunity, urgentOpportunity]);

  if (!data) return null;

  const opportunityPendingArchive = archiveOpportunityId
    ? data.opportunities.find((opportunity) => opportunity.id === archiveOpportunityId)
    : null;

  const confirmArchiveOpportunity = () => {
    if (!archiveOpportunityId) return;
    void archiveOpportunity(archiveOpportunityId);
    if (opportunityPendingArchive) {
      setNotice(`Archived ${opportunityPendingArchive.name}.`);
    }
    setArchiveOpportunityId(null);
  };

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

      <article className="bo-now-strip space-y-2">
        <p className="bo-now-label">What does the operator need right now?</p>
        <p className="text-sm text-textMuted">
          Focus the next revenue move, copy a brief, and keep follow-up momentum without menu digging.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="bo-link bo-link--sm" onClick={focusUrgentOpportunity}>
            Focus next urgent
          </button>
          <button className="bo-link bo-link--sm" onClick={copyOpportunityBrief}>
            Copy opportunity brief
          </button>
          <button className="bo-link bo-link--sm" onClick={snoozeSelectedOpportunity}>
            Snooze follow-up +1 day
          </button>
          <button className="bo-link bo-link--sm" onClick={copySelectedContactSummary}>
            Copy contact summary
          </button>
        </div>
        <p className="text-[11px] text-textSoft">
          Keyboard: Ctrl/Cmd+Shift+J focuses urgent · Ctrl/Cmd+Shift+R copies brief · Ctrl/Cmd+Shift+F snoozes follow-up.
        </p>
      </article>

      <div className="grid gap-2 md:grid-cols-4">
        <select
          className="rounded-lg border border-border bg-surface p-2 text-xs"
          value={filterType}
          onChange={(event) => setFilterType(event.target.value)}
        >
          <option value="all">All opportunity types</option>
          {Array.from(new Set(data.opportunities.map((item) => item.opportunityType))).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-border bg-surface p-2 text-xs"
          value={sortBy}
          onChange={(event) =>
            setSortBy(event.target.value as 'followUpDate' | 'updatedAt' | 'valueUsd')
          }
        >
          <option value="followUpDate">Sort: Follow-up date</option>
          <option value="updatedAt">Sort: Last updated</option>
          <option value="valueUsd">Sort: Value</option>
        </select>
        <button className="bo-link" onClick={() => setShowArchived((prev) => !prev)}>
          <ArchiveRestore size={12} className="mr-1 inline" />{' '}
          {showArchived ? 'Show active' : 'Show archived'}
        </button>
      </div>

      {viewMode === 'kanban' ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {stages.map((stage) => (
            <div key={stage} className="min-w-0 rounded-xl border border-border bg-bg/40 p-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-textMuted">{stage}</p>
              <div className="mt-2 space-y-2">
                {opportunityItems
                  .filter((item) => item.status === stage)
                  .map((item) => (
                    <button
                      key={item.id}
                      className="w-full rounded-lg border border-border bg-bg p-2 text-left text-xs"
                      onClick={() => setSelectedOpportunityId(item.id)}
                    >
                      <p className="line-clamp-2 font-medium text-text">{item.name}</p>
                      <p className="line-clamp-2 text-textMuted">{item.company}</p>
                      <p className="line-clamp-2 text-textSoft">Next: {item.nextAction}</p>
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
              className="w-full rounded-xl border border-border bg-bg/40 p-3 text-left text-xs"
              onClick={() => setSelectedOpportunityId(item.id)}
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-medium">{item.name}</p>
                <span className="shrink-0 bo-pill">{item.status}</span>
              </div>
              <p className="text-textMuted">
                {item.company} · {item.opportunityType}
              </p>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-3">
        <article className="rounded-xl border border-border bg-bg/40 p-3 text-xs xl:col-span-2">
          <h3 className="text-sm font-semibold">Revenue opportunity detail</h3>
          {selectedOpportunity ? (
            <div className="mt-2 space-y-2">
              <p className="text-textMuted">
                {selectedOpportunity.company} · {selectedOpportunity.role}
              </p>
              <p className="text-textMuted">{selectedOpportunity.notes}</p>
              <p>Follow-up: {new Date(selectedOpportunity.followUpDate).toLocaleString()}</p>
              <label className="block">
                <span className="text-textMuted">Status</span>
                <select
                  className="mt-1 w-full rounded-lg border border-border bg-surface p-2"
                  value={selectedOpportunity.status}
                  onChange={(event) =>
                    void updateOpportunity(selectedOpportunity.id, {
                      status: event.target.value as OpportunityStage
                    })
                  }
                >
                  {stages.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <button className="bo-link" onClick={copyOpportunityBrief}>
                  <Copy size={12} className="mr-1 inline" /> Copy brief
                </button>
                <button className="bo-link" onClick={snoozeSelectedOpportunity}>
                  Snooze +1 day
                </button>
                <button
                  className="bo-link"
                  onClick={() => setArchiveOpportunityId(selectedOpportunity.id)}
                >
                  Archive
                </button>
                <button
                  className="bo-link"
                  onClick={() => void restoreOpportunity(selectedOpportunity.id)}
                >
                  <TimerReset size={12} className="mr-1 inline" /> Restore
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-textSoft">No opportunity selected.</p>
          )}
        </article>

        <article className="rounded-xl border border-border bg-bg/40 p-3 text-xs">
          <h3 className="text-sm font-semibold">Relationship detail</h3>
          <select
            className="mt-2 w-full rounded-lg border border-border bg-surface p-2"
            value={selectedContact?.id ?? ''}
            onChange={(event) => setSelectedContactId(event.target.value)}
          >
            {data.contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </select>
          {selectedContact ? (
            <div className="mt-2 space-y-1 text-textMuted">
              <p>{selectedContact.company}</p>
              <p>{selectedContact.role}</p>
              <p className="text-textMuted">Next: {selectedContact.nextAction}</p>
              <p className="text-textSoft">
                Follow-up:{' '}
                {selectedContact.followUpDate
                  ? new Date(selectedContact.followUpDate).toLocaleDateString()
                  : 'Not set'}
              </p>
              <button className="bo-link bo-link--sm !mt-1" onClick={copySelectedContactSummary}>
                <Copy size={12} className="mr-1 inline" /> Copy contact
              </button>
            </div>
          ) : null}
        </article>
      </div>

      <article className="rounded-xl border border-border bg-bg/40 p-3 text-xs">
        <h3 className="inline-flex items-center gap-1 text-sm font-semibold">
          <BellRing size={13} /> Follow-up reminders
        </h3>
        <div className="mt-2 space-y-2">
          {reminders.map((item) => (
            <p key={item.id} className="rounded-lg border border-border bg-bg p-2">
              {item.name} — {new Date(item.followUpDate).toLocaleString()}
            </p>
          ))}
          {reminders.length === 0 ? (
            <p className="text-textSoft">No reminders due in the next 48 hours.</p>
          ) : null}
        </div>
      </article>

      <article className="rounded-xl border border-border bg-bg/40 p-3 text-xs">
        <h3 className="text-sm font-semibold">Recent activity timeline</h3>
        <div className="mt-2 space-y-2">
          {data.notes
            .slice()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 6)
            .map((note) => (
              <div key={note.id} className="rounded-lg border border-border bg-bg p-2">
                <p className="font-medium">{note.title}</p>
                <p className="text-textMuted">{note.detail}</p>
              </div>
            ))}
        </div>
      </article>

      {notice ? <p className="text-xs text-textMuted">{notice}</p> : null}
      <ConfirmDialog
        open={Boolean(archiveOpportunityId)}
        title="Archive opportunity?"
        description="Archived opportunities are hidden from active pipeline views until restored."
        confirmLabel="Archive opportunity"
        cancelLabel="Keep active"
        tone="danger"
        onConfirm={confirmArchiveOpportunity}
        onCancel={() => setArchiveOpportunityId(null)}
      />
    </section>
  );
}
