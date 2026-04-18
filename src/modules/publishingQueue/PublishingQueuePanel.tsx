import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Copy, ExternalLink, SkipForward } from 'lucide-react';
import { PUBLISHING_QUEUE_STATUSES } from './index';
import { QueueStatus } from '../../types/domain';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';

type ViewMode = 'list' | 'calendar';

const REMINDER_PRESETS = [15, 30, 60, 120, 1440];

const toInputDateTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  const tzOffset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

const fromInputDateTime = (value: string) => {
  if (!value) return undefined;
  return new Date(value).toISOString();
};

const getDerivedStatus = (status: QueueStatus, scheduledFor?: string): QueueStatus => {
  if (status === 'posted' || status === 'skipped') return status;
  if (!scheduledFor) return 'ready-to-post';

  const dueTime = new Date(scheduledFor).getTime();
  const now = Date.now();
  const hoursUntilDue = (dueTime - now) / (1000 * 60 * 60);

  if (hoursUntilDue <= 0) return 'ready-to-post';
  if (hoursUntilDue <= 12) return 'due-soon';
  return 'queued';
};

const statusPillClass: Record<QueueStatus, string> = {
  queued: 'bg-surface/80 text-text',
  'due-soon': 'bg-warningSoft text-warning border border-warning/40',
  'ready-to-post': 'bg-primarySoft text-text border border-primary/40',
  posted: 'bg-successSoft text-text border border-success/40',
  skipped: 'bg-dangerSoft text-danger border border-danger/40'
};

export function PublishingQueuePanel() {
  const {
    data,
    addPublishingDraft,
    updatePublishingStatus,
    updatePublishingItem,
    quickReschedulePublishingItem
  } = useBrandOpsStore();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: '',
    body: '',
    contentLibraryItemId: '',
    scheduledFor: '',
    reminderLeadMinutes: 60,
    checklist: 'Hook is clear\nCTA is explicit\nNo unsafe automation claims'
  });

  const queueItems = useMemo(() => {
    if (!data) return [];

    return [...data.publishingQueue]
      .map((item) => ({
        ...item,
        derivedStatus: getDerivedStatus(item.status, item.scheduledFor),
        overdue:
          Boolean(item.scheduledFor) &&
          new Date(item.scheduledFor as string).getTime() < Date.now() &&
          item.status !== 'posted' &&
          item.status !== 'skipped'
      }))
      .sort((a, b) => {
        const aDue = a.scheduledFor ? new Date(a.scheduledFor).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.scheduledFor ? new Date(b.scheduledFor).getTime() : Number.MAX_SAFE_INTEGER;
        return aDue - bDue;
      });
  }, [data]);

  const nextActionableItem = useMemo(
    () =>
      queueItems.find((item) => item.status !== 'posted' && item.status !== 'skipped') ??
      queueItems[0],
    [queueItems]
  );

  const openLinkedInComposer = () => {
    window.open('https://www.linkedin.com/feed/', '_blank', 'noopener,noreferrer');
    setNotice('LinkedIn opened in a new tab.');
  };

  const saveShipSlot = () => {
    if (!draft.title.trim() || !draft.body.trim()) {
      setNotice('Add a title and body before saving a ship slot.');
      return;
    }
    const scheduledForIso = fromInputDateTime(draft.scheduledFor);
    const reminderAt = scheduledForIso
      ? new Date(new Date(scheduledForIso).getTime() - draft.reminderLeadMinutes * 60 * 1000).toISOString()
      : undefined;

    void addPublishingDraft({
      title: draft.title.trim(),
      body: draft.body.trim(),
      contentLibraryItemId: draft.contentLibraryItemId || undefined,
      scheduledFor: scheduledForIso,
      reminderAt,
      reminderLeadMinutes: draft.reminderLeadMinutes,
      checklist: draft.checklist.trim()
    });

    setDraft({
      title: '',
      body: '',
      contentLibraryItemId: '',
      scheduledFor: '',
      reminderLeadMinutes: 60,
      checklist: 'Hook is clear\nCTA is explicit\nNo unsafe automation claims'
    });
    setNotice('Ship slot saved.');
  };

  const copyNextShipDraft = () => {
    if (!nextActionableItem) {
      setNotice('No queue item available to copy.');
      return;
    }
    void navigator.clipboard.writeText(nextActionableItem.body);
    setNotice(`Copied “${nextActionableItem.title}” to clipboard.`);
  };

  const markNextAsPosted = () => {
    if (!nextActionableItem) {
      setNotice('No queue item selected to mark as posted.');
      return;
    }
    void updatePublishingStatus(nextActionableItem.id, 'posted');
    setNotice(`Marked “${nextActionableItem.title}” as posted.`);
  };

  const calendarGroups = useMemo(() => {
    return queueItems.reduce<Record<string, typeof queueItems>>((acc, item) => {
      const key = item.scheduledFor ? new Date(item.scheduledFor).toDateString() : 'Unscheduled';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [queueItems]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true;
      if (isTyping || !(event.metaKey || event.ctrlKey) || !event.shiftKey) return;

      if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (!draft.title.trim() || !draft.body.trim()) {
          setNotice('Add a title and body before saving a ship slot.');
          return;
        }
        const scheduledForIso = fromInputDateTime(draft.scheduledFor);
        const reminderAt = scheduledForIso
          ? new Date(
              new Date(scheduledForIso).getTime() - draft.reminderLeadMinutes * 60 * 1000
            ).toISOString()
          : undefined;

        void addPublishingDraft({
          title: draft.title.trim(),
          body: draft.body.trim(),
          contentLibraryItemId: draft.contentLibraryItemId || undefined,
          scheduledFor: scheduledForIso,
          reminderAt,
          reminderLeadMinutes: draft.reminderLeadMinutes,
          checklist: draft.checklist.trim()
        });

        setDraft({
          title: '',
          body: '',
          contentLibraryItemId: '',
          scheduledFor: '',
          reminderLeadMinutes: 60,
          checklist: 'Hook is clear\nCTA is explicit\nNo unsafe automation claims'
        });
        setNotice('Ship slot saved.');
      }
      if (event.key.toLowerCase() === 'q') {
        event.preventDefault();
        if (!nextActionableItem) {
          setNotice('No queue item available to copy.');
          return;
        }
        void navigator.clipboard.writeText(nextActionableItem.body);
        setNotice(`Copied “${nextActionableItem.title}” to clipboard.`);
      }
      if (event.key.toLowerCase() === 'l') {
        event.preventDefault();
        window.open('https://www.linkedin.com/feed/', '_blank', 'noopener,noreferrer');
        setNotice('LinkedIn opened in a new tab.');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [addPublishingDraft, draft, nextActionableItem]);

  if (!data) return null;

  return (
    <section className="bo-card space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Publishing Queue</h2>
          <p className="text-xs text-textMuted">
            Plan your public shipping rhythm so visibility supports the business instead of interrupting it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="bo-link !px-2 !py-1"
            onClick={() => setViewMode('list')}
            disabled={viewMode === 'list'}
          >
            List
          </button>
          <button
            className="bo-link !px-2 !py-1"
            onClick={() => setViewMode('calendar')}
            disabled={viewMode === 'calendar'}
          >
            Calendar
          </button>
        </div>
      </header>

      <article className="bo-now-strip space-y-2">
        <p className="bo-now-label">What does the operator need right now?</p>
        <p className="text-sm text-textMuted">
          Ship the next queued post with minimal friction: copy, publish, and mark status in one pass.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="bo-link !px-2 !py-1" onClick={saveShipSlot}>
            Save ship slot
          </button>
          <button className="bo-link !px-2 !py-1" onClick={copyNextShipDraft}>
            Copy next post
          </button>
          <button className="bo-link !px-2 !py-1" onClick={openLinkedInComposer}>
            Open LinkedIn
          </button>
          <button className="bo-link !px-2 !py-1" onClick={markNextAsPosted}>
            Mark next as posted
          </button>
        </div>
        <p className="text-[11px] text-textSoft">
          Keyboard: Ctrl/Cmd+Shift+S saves slot · Ctrl/Cmd+Shift+Q copies next post · Ctrl/Cmd+Shift+L opens LinkedIn.
        </p>
      </article>

      <article className="rounded-xl border border-border bg-bg/45 p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-textMuted">
          <CalendarClock size={14} />
          Queue public-facing output
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <input
            value={draft.title}
            onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Asset title"
            className="rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm"
          />
          <select
            value={draft.contentLibraryItemId}
            onChange={(event) => setDraft((prev) => ({ ...prev, contentLibraryItemId: event.target.value }))}
            className="rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm"
          >
            <option value="">No linked content item</option>
            {data.contentLibrary.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <textarea
            value={draft.body}
            onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
            rows={4}
            placeholder="Paste post, thread, or announcement copy"
            className="rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm md:col-span-2"
          />
          <label className="text-xs text-textMuted space-y-1">
            <span>Ship date & time</span>
            <input
              type="datetime-local"
              value={draft.scheduledFor}
              onChange={(event) => setDraft((prev) => ({ ...prev, scheduledFor: event.target.value }))}
              className="w-full rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-textMuted space-y-1">
            <span>Reminder lead time</span>
            <select
              value={draft.reminderLeadMinutes}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, reminderLeadMinutes: Number(event.target.value) }))
              }
              className="w-full rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm"
            >
              {REMINDER_PRESETS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`} before
                </option>
              ))}
            </select>
          </label>
          <textarea
            value={draft.checklist}
            onChange={(event) => setDraft((prev) => ({ ...prev, checklist: event.target.value }))}
            rows={3}
            placeholder="Pre-ship checklist"
            className="rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm md:col-span-2"
          />
        </div>
        <button className="bo-link" onClick={saveShipSlot}>
          Save ship slot
        </button>
      </article>

      {(viewMode === 'list' ? queueItems : Object.values(calendarGroups).flat()).map((item) => (
        <article key={item.id} className="rounded-xl border border-border bg-bg/40 p-3 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium text-text">{item.title}</p>
              <p className="mt-1 text-xs text-textMuted">
                Due:{' '}
                {item.scheduledFor
                  ? new Date(item.scheduledFor).toLocaleString()
                  : 'No schedule yet (ready when you are)'}
              </p>
            </div>
            <span className={`bo-pill ${statusPillClass[item.derivedStatus]}`}>{item.derivedStatus}</span>
          </div>

          {item.overdue ? <p className="mt-2 text-xs text-danger">Overdue: past due and not posted.</p> : null}
          {item.checklist ? (
            <p className="mt-2 whitespace-pre-wrap text-xs text-textMuted">Checklist:\n{item.checklist}</p>
          ) : null}

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <input
              type="datetime-local"
              value={toInputDateTime(item.scheduledFor)}
              onChange={(event) => {
                const scheduledFor = fromInputDateTime(event.target.value);
                const reminderLead = item.reminderLeadMinutes ?? 60;
                const reminderAt = scheduledFor
                  ? new Date(new Date(scheduledFor).getTime() - reminderLead * 60 * 1000).toISOString()
                  : undefined;
                void updatePublishingItem(item.id, { scheduledFor, reminderAt, status: 'queued' });
              }}
              className="rounded-lg border border-border bg-bg/55 px-2 py-1 text-xs"
            />
            <select
              value={item.reminderLeadMinutes ?? 60}
              onChange={(event) => {
                const minutes = Number(event.target.value);
                const reminderAt = item.scheduledFor
                  ? new Date(new Date(item.scheduledFor).getTime() - minutes * 60 * 1000).toISOString()
                  : undefined;
                void updatePublishingItem(item.id, {
                  reminderLeadMinutes: minutes,
                  reminderAt
                });
              }}
              className="rounded-lg border border-border bg-bg/55 px-2 py-1 text-xs"
            >
              {REMINDER_PRESETS.map((minutes) => (
                <option key={`${item.id}-${minutes}`} value={minutes}>
                  Reminder {minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`} early
                </option>
              ))}
            </select>
            <select
              value={item.status}
              onChange={(event) => void updatePublishingStatus(item.id, event.target.value as QueueStatus)}
              className="rounded-lg border border-border bg-bg/55 px-2 py-1 text-xs"
            >
              {PUBLISHING_QUEUE_STATUSES.map((status) => (
                <option key={`${item.id}-${status.value}`} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <button className="bo-link !px-2 !py-1" onClick={() => void quickReschedulePublishingItem(item.id, 60)}>
              +1h
            </button>
            <button className="bo-link !px-2 !py-1" onClick={() => void quickReschedulePublishingItem(item.id, 1440)}>
              +1 day
            </button>
            <button
              className="bo-link !px-2 !py-1"
              onClick={() => {
                void navigator.clipboard.writeText(item.body);
                setNotice(`Copied “${item.title}” to clipboard.`);
              }}
            >
              <Copy size={12} className="mr-1 inline" /> Copy post content
            </button>
            <button
              className="bo-link !px-2 !py-1"
              onClick={openLinkedInComposer}
            >
              <ExternalLink size={12} className="mr-1 inline" /> Open LinkedIn
            </button>
            <button className="bo-link !px-2 !py-1" onClick={() => void updatePublishingStatus(item.id, 'posted')}>
              <CheckCircle2 size={12} className="mr-1 inline" /> Mark posted
            </button>
            <button className="bo-link !px-2 !py-1" onClick={() => void updatePublishingStatus(item.id, 'skipped')}>
              <SkipForward size={12} className="mr-1 inline" /> Mark skipped
            </button>
          </div>
        </article>
      ))}

      {viewMode === 'calendar' ? (
        <div className="space-y-2">
          {Object.entries(calendarGroups).map(([day, items]) => (
            <div key={day} className="rounded-xl border border-border bg-bg/30 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-textMuted">{day}</p>
              <ul className="mt-2 space-y-1 text-xs text-textMuted">
                {items.map((item) => (
                  <li key={`cal-${item.id}`}>
                    {item.scheduledFor ? new Date(item.scheduledFor).toLocaleTimeString() : '—'} • {item.title}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {notice ? <p className="text-xs text-textMuted">{notice}</p> : null}
    </section>
  );
}
