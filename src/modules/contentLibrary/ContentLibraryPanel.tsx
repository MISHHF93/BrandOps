import { useMemo, useState } from 'react';
import { Archive, Copy, Layers3, Search, SquarePen } from 'lucide-react';
import { CONTENT_ITEM_STATUSES, CONTENT_ITEM_TYPES, PUBLISH_CHANNELS } from './index';
import { ContentItemStatus, ContentItemType } from '../../types/domain';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';

const ALL_FILTER = 'all';

type FilterValue = typeof ALL_FILTER | ContentItemType | ContentItemStatus;

const EMPTY_FORM = {
  type: 'post-draft' as ContentItemType,
  title: '',
  body: '',
  tags: '',
  audience: '',
  goal: '',
  status: 'idea' as ContentItemStatus,
  publishChannel: 'linkedin' as const,
  notes: ''
};

export function ContentLibraryPanel() {
  const {
    data,
    addContentLibraryItem,
    updateContentLibraryItem,
    duplicateContentLibraryItem,
    archiveContentLibraryItem
  } = useBrandOpsStore();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterValue>(ALL_FILTER);
  const [statusFilter, setStatusFilter] = useState<FilterValue>(ALL_FILTER);
  const [tagFilter, setTagFilter] = useState(ALL_FILTER);
  const [draft, setDraft] = useState(EMPTY_FORM);
  const [notice, setNotice] = useState<string | null>(null);

  const allTags = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.contentLibrary.flatMap((item) => item.tags))).sort();
  }, [data]);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    const search = query.trim().toLowerCase();

    return data.contentLibrary.filter((item) => {
      const typeMatch = typeFilter === ALL_FILTER || item.type === typeFilter;
      const statusMatch = statusFilter === ALL_FILTER || item.status === statusFilter;
      const tagMatch = tagFilter === ALL_FILTER || item.tags.includes(tagFilter);
      const searchMatch =
        search.length === 0 ||
        [item.title, item.body, item.audience, item.goal, item.notes, item.tags.join(' ')].some((value) =>
          value.toLowerCase().includes(search)
        );

      return typeMatch && statusMatch && tagMatch && searchMatch;
    });
  }, [data, query, statusFilter, tagFilter, typeFilter]);

  if (!data) return null;

  return (
    <section className="bo-card space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Content Library</h2>
          <p className="text-xs text-slate-400">
            Editorial workspace for drafts, ideas, reusable blocks, and publishing assets.
          </p>
        </div>
        <span className="bo-pill">{filteredItems.length} visible</span>
      </header>

      <article className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs text-slate-300">
          <SquarePen size={13} />
          Create content item
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <input
            value={draft.title}
            onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Title"
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
          />
          <select
            value={draft.type}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, type: event.target.value as ContentItemType }))
            }
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
          >
            {CONTENT_ITEM_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <textarea
            value={draft.body}
            onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
            rows={4}
            placeholder="Content body"
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm md:col-span-2"
          />
          <input
            value={draft.tags}
            onChange={(event) => setDraft((prev) => ({ ...prev, tags: event.target.value }))}
            placeholder="Tags (comma separated)"
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
          />
          <input
            value={draft.audience}
            onChange={(event) => setDraft((prev) => ({ ...prev, audience: event.target.value }))}
            placeholder="Audience"
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
          />
          <input
            value={draft.goal}
            onChange={(event) => setDraft((prev) => ({ ...prev, goal: event.target.value }))}
            placeholder="Goal"
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
          />
          <select
            value={draft.status}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, status: event.target.value as ContentItemStatus }))
            }
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
          >
            {CONTENT_ITEM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            value={draft.publishChannel}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, publishChannel: event.target.value as typeof draft.publishChannel }))
            }
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
          >
            {PUBLISH_CHANNELS.map((channel) => (
              <option key={channel} value={channel}>
                {channel}
              </option>
            ))}
          </select>
          <input
            value={draft.notes}
            onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Notes"
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
          />
        </div>
        <button
          className="bo-link mt-2"
          onClick={() => {
            if (!draft.title.trim() || !draft.body.trim()) return;
            void addContentLibraryItem({
              type: draft.type,
              title: draft.title.trim(),
              body: draft.body.trim(),
              tags: draft.tags
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
              audience: draft.audience.trim(),
              goal: draft.goal.trim(),
              status: draft.status,
              publishChannel: draft.publishChannel,
              notes: draft.notes.trim()
            });
            setDraft(EMPTY_FORM);
          }}
        >
          Save content item
        </button>
      </article>

      <div className="grid gap-2 md:grid-cols-4">
        <label className="relative md:col-span-2">
          <Search size={14} className="pointer-events-none absolute left-2 top-2.5 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, body, audience, goal, notes, tags"
            className="w-full rounded-lg border border-slate-700 bg-slate-950/55 py-2 pl-8 pr-3 text-xs"
          />
        </label>
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as FilterValue)}
          className="rounded-lg border border-slate-700 bg-slate-950/55 px-2 py-2 text-xs"
        >
          <option value={ALL_FILTER}>All types</option>
          {CONTENT_ITEM_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as FilterValue)}
          className="rounded-lg border border-slate-700 bg-slate-950/55 px-2 py-2 text-xs"
        >
          <option value={ALL_FILTER}>All statuses</option>
          {CONTENT_ITEM_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select
          value={tagFilter}
          onChange={(event) => setTagFilter(event.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950/55 px-2 py-2 text-xs"
        >
          <option value={ALL_FILTER}>All tags</option>
          {allTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {filteredItems.map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-slate-100">{item.title}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {item.type} • {item.publishChannel} • {item.audience || 'General audience'}
                </p>
              </div>
              <span className="bo-pill">{item.status}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-xs text-slate-300">{item.body}</p>
            {item.notes ? <p className="mt-2 text-xs text-slate-400">Notes: {item.notes}</p> : null}
            <div className="mt-2 flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <span key={`${item.id}-${tag}`} className="bo-pill !px-2 !py-0.5">
                  #{tag}
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <select
                value={item.status}
                onChange={(event) =>
                  void updateContentLibraryItem(item.id, {
                    status: event.target.value as ContentItemStatus
                  })
                }
                className="rounded-lg border border-slate-700 bg-slate-950/55 px-2 py-1"
              >
                {CONTENT_ITEM_STATUSES.map((status) => (
                  <option key={`${item.id}-${status}`} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button
                className="bo-link !px-2 !py-1"
                onClick={() => void duplicateContentLibraryItem(item.id)}
              >
                <Layers3 size={12} className="mr-1 inline" /> Duplicate
              </button>
              <button
                className="bo-link !px-2 !py-1"
                onClick={() => {
                  void navigator.clipboard.writeText(item.body);
                  setNotice(`Copied “${item.title}” to clipboard.`);
                }}
              >
                <Copy size={12} className="mr-1 inline" /> Copy
              </button>
              <button
                className="bo-link !px-2 !py-1"
                onClick={() => void archiveContentLibraryItem(item.id)}
                disabled={item.status === 'archived'}
              >
                <Archive size={12} className="mr-1 inline" /> Archive
              </button>
            </div>
          </article>
        ))}
      </div>

      {notice ? <p className="text-xs text-emerald-300">{notice}</p> : null}
    </section>
  );
}
