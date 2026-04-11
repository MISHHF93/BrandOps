import { useMemo, useState } from 'react';
import { Archive, Copy, Filter, History, MailPlus, Send, Sparkles, Target, Workflow } from 'lucide-react';
import { OutreachCategory, OutreachStatus, OutreachTemplate } from '../../types/domain';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';

const outreachCategories: OutreachCategory[] = [
  'collaboration',
  'consulting',
  'technical build partnership',
  'founder intro',
  'follow-up',
  'warm reconnect',
  'recruiting reply'
];

const statuses: OutreachStatus[] = ['draft', 'ready', 'scheduled follow-up', 'sent', 'replied', 'archived'];

const tones = [
  'Operator-grade and technically credible',
  'Concise and direct',
  'Collaborative and warm',
  'Confident founder-to-founder'
];

const transformLine = (line: string, tone: string) => {
  if (tone.toLowerCase().includes('concise')) return line.trim();
  if (tone.toLowerCase().includes('collaborative')) return `Appreciate your work here — ${line.trim()}`;
  if (tone.toLowerCase().includes('founder')) return `${line.trim()} I'm focused on building durable technical leverage.`;
  return line.trim();
};

const buildVariant = (template: OutreachTemplate, tone: string, goal: string, targetName: string, company: string) => {
  const opener = template.openerBlock.replaceAll('{target}', targetName).replaceAll('{company}', company);
  const blocks = [
    opener,
    template.valueBlock,
    template.proofBlock,
    `${template.callToActionBlock}\nGoal: ${goal}`,
    template.signoffBlock
  ];

  return blocks
    .filter(Boolean)
    .map((line) => transformLine(line, tone))
    .join('\n\n');
};

export function OutreachWorkspacePanel() {
  const { data, addOutreachDraft, updateOutreachDraft, archiveOutreachDraft, addOutreachTemplate } = useBrandOpsStore();

  const [form, setForm] = useState({
    category: 'consulting' as OutreachCategory,
    targetName: '',
    company: '',
    role: '',
    messageBody: '',
    outreachGoal: '',
    tone: tones[0],
    status: 'draft' as OutreachStatus,
    linkedOpportunity: '',
    notes: ''
  });

  const [filters, setFilters] = useState({ status: 'all', goal: 'all', company: 'all' });
  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: 'consulting' as OutreachCategory,
    openerBlock: '',
    valueBlock: '',
    proofBlock: '',
    callToActionBlock: '',
    signoffBlock: ''
  });

  const uniqueGoals = useMemo(
    () => Array.from(new Set((data?.outreachDrafts ?? []).map((draft) => draft.outreachGoal).filter(Boolean))),
    [data?.outreachDrafts]
  );
  const uniqueCompanies = useMemo(
    () => Array.from(new Set((data?.outreachDrafts ?? []).map((draft) => draft.company).filter(Boolean))),
    [data?.outreachDrafts]
  );

  const filteredDrafts = useMemo(() => {
    if (!data) return [];
    return data.outreachDrafts.filter((draft) => {
      const statusMatch = filters.status === 'all' || draft.status === filters.status;
      const goalMatch = filters.goal === 'all' || draft.outreachGoal === filters.goal;
      const companyMatch = filters.company === 'all' || draft.company === filters.company;
      return statusMatch && goalMatch && companyMatch;
    });
  }, [data, filters]);

  const variants = useMemo(() => {
    if (!data?.outreachTemplates.length || !form.outreachGoal) return [];
    const selectedTemplate = data.outreachTemplates.find((tpl) => tpl.category === form.category) ?? data.outreachTemplates[0];
    return [
      buildVariant(selectedTemplate, form.tone, form.outreachGoal, form.targetName || 'there', form.company || 'your team'),
      buildVariant(selectedTemplate, 'Concise and direct', form.outreachGoal, form.targetName || 'there', form.company || 'your team'),
      buildVariant(selectedTemplate, 'Collaborative and warm', form.outreachGoal, form.targetName || 'there', form.company || 'your team')
    ];
  }, [data?.outreachTemplates, form]);

  if (!data) return null;

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <section className="grid gap-3 xl:grid-cols-3">
      <article className="bo-card space-y-3 xl:col-span-2">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Outreach Workspace</h2>
          <Workflow size={14} className="text-cyan-300" />
        </header>
        <p className="text-xs text-slate-400">
          Operator-grade outreach control room for collaboration, consulting, and technical partnership flow.
        </p>

        <div className="grid gap-2 md:grid-cols-2">
          <label className="text-xs text-slate-300">
            Category
            <select
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value as OutreachCategory }))}
            >
              {outreachCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-300">
            Status
            <select
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as OutreachStatus }))}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          {[
            ['Target name', 'targetName'],
            ['Company', 'company'],
            ['Role', 'role'],
            ['Outreach goal', 'outreachGoal'],
            ['Linked opportunity', 'linkedOpportunity']
          ].map(([label, key]) => (
            <label key={key} className="text-xs text-slate-300">
              {label}
              <input
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
                value={form[key as keyof typeof form] as string}
                onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
              />
            </label>
          ))}

          <label className="text-xs text-slate-300 md:col-span-2">
            Tone
            <select
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
              value={form.tone}
              onChange={(event) => setForm((prev) => ({ ...prev, tone: event.target.value }))}
            >
              {tones.map((tone) => (
                <option key={tone} value={tone}>
                  {tone}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-300 md:col-span-2">
            Message body
            <textarea
              className="mt-1 min-h-24 w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
              value={form.messageBody}
              onChange={(event) => setForm((prev) => ({ ...prev, messageBody: event.target.value }))}
            />
          </label>

          <label className="text-xs text-slate-300 md:col-span-2">
            Notes
            <textarea
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </label>
        </div>

        <button
          className="bo-link inline-flex items-center gap-2"
          onClick={() =>
            void addOutreachDraft({
              category: form.category,
              targetName: form.targetName,
              company: form.company,
              role: form.role,
              messageBody: form.messageBody,
              outreachGoal: form.outreachGoal,
              tone: form.tone,
              linkedOpportunity: form.linkedOpportunity || undefined,
              notes: form.notes
            })
          }
        >
          <MailPlus size={14} /> Create outreach draft
        </button>

        <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <header className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Template variants</h3>
            <Sparkles size={14} className="text-violet-300" />
          </header>
          {variants.length === 0 ? (
            <p className="text-xs text-slate-500">Add outreach goal and at least one template block to generate variants.</p>
          ) : (
            <div className="grid gap-2">
              {variants.map((variant, index) => (
                <div key={index} className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
                  <p className="whitespace-pre-line">{variant}</p>
                  <button className="bo-link mt-2 inline-flex items-center gap-1" onClick={() => void copyToClipboard(variant)}>
                    <Copy size={12} /> Quick copy
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </article>

      <article className="bo-card space-y-3">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Control Room</h2>
          <Target size={14} className="text-emerald-300" />
        </header>

        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <p className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-slate-400">
            <Filter size={12} /> Filters
          </p>
          {([
            ['status', ['all', ...statuses]],
            ['goal', ['all', ...uniqueGoals]],
            ['company', ['all', ...uniqueCompanies]]
          ] as const).map(([key, options]) => (
            <select
              key={key}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs"
              value={filters[key]}
              onChange={(event) => setFilters((prev) => ({ ...prev, [key]: event.target.value }))}
            >
              {options.map((value) => (
                <option key={value} value={value}>
                  {key}: {value}
                </option>
              ))}
            </select>
          ))}
        </div>

        <div className="max-h-64 space-y-2 overflow-auto">
          {filteredDrafts.map((draft) => (
            <div key={draft.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs">
              <p className="text-sm font-medium">{draft.targetName}</p>
              <p className="text-slate-400">{draft.company} · {draft.role || 'Role not set'}</p>
              <p className="mt-1 text-slate-300 line-clamp-3">{draft.messageBody}</p>
              <p className="mt-1 text-slate-500">{draft.category} · {draft.status}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="bo-link inline-flex items-center gap-1" onClick={() => void copyToClipboard(draft.messageBody)}>
                  <Copy size={12} /> Copy
                </button>
                <button className="bo-link inline-flex items-center gap-1" onClick={() => void updateOutreachDraft(draft.id, { status: 'sent' })}>
                  <Send size={12} /> Mark sent
                </button>
                <button className="bo-link inline-flex items-center gap-1" onClick={() => void archiveOutreachDraft(draft.id)}>
                  <Archive size={12} /> Archive
                </button>
              </div>
            </div>
          ))}
        </div>

        <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Save template</p>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs"
            placeholder="Template name"
            value={templateForm.name}
            onChange={(event) => setTemplateForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <textarea className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs" placeholder="Opener block" value={templateForm.openerBlock} onChange={(event) => setTemplateForm((prev) => ({ ...prev, openerBlock: event.target.value }))} />
          <textarea className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs" placeholder="Value block" value={templateForm.valueBlock} onChange={(event) => setTemplateForm((prev) => ({ ...prev, valueBlock: event.target.value }))} />
          <textarea className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs" placeholder="Proof block" value={templateForm.proofBlock} onChange={(event) => setTemplateForm((prev) => ({ ...prev, proofBlock: event.target.value }))} />
          <textarea className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs" placeholder="Call-to-action block" value={templateForm.callToActionBlock} onChange={(event) => setTemplateForm((prev) => ({ ...prev, callToActionBlock: event.target.value }))} />
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs"
            placeholder="Signoff block"
            value={templateForm.signoffBlock}
            onChange={(event) => setTemplateForm((prev) => ({ ...prev, signoffBlock: event.target.value }))}
          />
          <button
            className="bo-link"
            onClick={() =>
              void addOutreachTemplate({
                ...templateForm,
                category: templateForm.category
              })
            }
          >
            Save reusable template
          </button>
        </section>

        <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <p className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-slate-400"><History size={12} /> Recent outreach history</p>
          {data.outreachHistory.slice(0, 5).map((entry) => (
            <div key={entry.id} className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs">
              <p className="font-medium">{entry.targetName} · {entry.status}</p>
              <p className="text-slate-400">{entry.company}</p>
              <p className="text-slate-500">{new Date(entry.loggedAt).toLocaleString()}</p>
            </div>
          ))}
        </section>
      </article>
    </section>
  );
}
