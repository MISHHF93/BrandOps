import { useState } from 'react';
import { ClipboardCopy, Download, Upload } from 'lucide-react';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';
import { BrandVaultListField } from '../../types/domain';

interface ListSectionConfig {
  key: BrandVaultListField;
  label: string;
  helper: string;
}

const listSections: ListSectionConfig[] = [
  {
    key: 'headlineOptions',
    label: 'Headline options',
    helper: 'Keep 3-7 concise variants for different profile surfaces.'
  },
  {
    key: 'serviceOfferings',
    label: 'Service offerings',
    helper: 'Define your packaged outcomes and engagement scope.'
  },
  {
    key: 'collaborationModes',
    label: 'Collaboration modes',
    helper: 'Document how clients can work with you.'
  },
  {
    key: 'outreachAngles',
    label: 'Outreach angles',
    helper: 'Store opening themes tied to pain + value.'
  },
  {
    key: 'audienceSegments',
    label: 'Audience segments',
    helper: 'Clarify who each message is targeting.'
  },
  {
    key: 'expertiseAreas',
    label: 'Expertise areas',
    helper: 'List the capabilities you want associated with your brand.'
  },
  {
    key: 'industries',
    label: 'Industries',
    helper: 'Keep your strongest verticals visible for content and outreach.'
  },
  {
    key: 'proofPoints',
    label: 'Proof points',
    helper: 'Add quantified outcomes and concrete transformation statements.'
  },
  {
    key: 'signatureThemes',
    label: 'Signature themes',
    helper: 'Themes you repeatedly teach and publish on.'
  },
  {
    key: 'preferredVoiceNotes',
    label: 'Preferred voice notes',
    helper: 'How your writing should feel in tone and structure.'
  },
  {
    key: 'bannedPhrases',
    label: 'Banned phrases',
    helper: 'Avoid these phrases to protect trust and positioning quality.'
  },
  {
    key: 'callsToAction',
    label: 'Calls to action',
    helper: 'Ready-to-use CTAs for posts, DMs, and email closers.'
  },
  {
    key: 'reusableSnippets',
    label: 'Reusable snippets',
    helper: 'Reusable messaging blocks for fast drafting.'
  },
  {
    key: 'personalNotes',
    label: 'Personal notes',
    helper: 'Private context and reminders for message consistency.'
  }
];

function OneClickCopy({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className="bo-link w-full text-left"
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <span className="bo-pill">{copied ? 'Copied' : 'Copy'}</span>
      </div>
      <p className="mt-2 line-clamp-3 text-sm text-slate-200">{text}</p>
    </button>
  );
}

export function BrandVaultPanel() {
  const {
    data,
    updateBrandVaultTextField,
    addBrandVaultListItem,
    updateBrandVaultListItem,
    deleteBrandVaultListItem,
    reorderBrandVaultListItem,
    exportBrandVault,
    importBrandVault
  } = useBrandOpsStore();

  const [drafts, setDrafts] = useState<Partial<Record<BrandVaultListField, string>>>({});
  const [importRaw, setImportRaw] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  if (!data) return null;

  const { brandVault } = data;

  return (
    <section className="bo-card space-y-4">
      <header className="space-y-1">
        <h2 className="text-base font-semibold">Brand Vault · Private control room</h2>
        <p className="text-xs text-slate-400">
          Your source-of-truth messaging system across publishing and outreach.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <OneClickCopy label="Positioning statement" text={brandVault.positioningStatement} />
        <OneClickCopy label="Short bio" text={brandVault.shortBio} />
        <OneClickCopy label="Full about summary" text={brandVault.fullAboutSummary} />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <article className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3 xl:col-span-2">
          <h3 className="text-sm font-semibold">Core narrative</h3>
          <p className="text-xs text-slate-400">Your foundational blocks used in bios and profile copy.</p>

          <label className="block space-y-1 text-xs">
            <span className="text-slate-300">Positioning statement</span>
            <textarea
              value={brandVault.positioningStatement}
              onChange={(event) =>
                void updateBrandVaultTextField('positioningStatement', event.target.value)
              }
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2"
            />
          </label>

          <label className="block space-y-1 text-xs">
            <span className="text-slate-300">Short bio</span>
            <textarea
              value={brandVault.shortBio}
              onChange={(event) => void updateBrandVaultTextField('shortBio', event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2"
            />
          </label>

          <label className="block space-y-1 text-xs">
            <span className="text-slate-300">Full about summary</span>
            <textarea
              value={brandVault.fullAboutSummary}
              onChange={(event) => void updateBrandVaultTextField('fullAboutSummary', event.target.value)}
              rows={5}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2"
            />
          </label>
        </article>

        <article className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <h3 className="text-sm font-semibold">Vault JSON</h3>
          <p className="text-xs text-slate-400">Export or import only your Brand Vault profile.</p>
          <button
            className="bo-link w-full"
            onClick={() =>
              void (async () => {
                const payload = await exportBrandVault();
                await navigator.clipboard.writeText(payload);
                setNotice('Brand Vault JSON copied to clipboard.');
              })()
            }
          >
            <Download size={12} className="mr-1 inline" /> Export Brand Vault
          </button>
          <button
            className="bo-link w-full"
            onClick={() =>
              void (async () => {
                if (!importRaw.trim()) return;
                await importBrandVault(importRaw);
                setImportRaw('');
                setNotice('Brand Vault imported.');
              })()
            }
          >
            <Upload size={12} className="mr-1 inline" /> Import Brand Vault
          </button>
          <textarea
            value={importRaw}
            onChange={(event) => setImportRaw(event.target.value)}
            rows={8}
            placeholder="Paste Brand Vault JSON"
            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs"
          />
          {notice ? <p className="text-xs text-emerald-300">{notice}</p> : null}
        </article>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {listSections.map((section) => (
          <article key={section.key} className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <h3 className="text-sm font-semibold">{section.label}</h3>
            <p className="text-xs text-slate-400">{section.helper}</p>

            <div className="flex gap-2">
              <input
                value={drafts[section.key] ?? ''}
                onChange={(event) =>
                  setDrafts((current) => ({ ...current, [section.key]: event.target.value }))
                }
                placeholder={`Add ${section.label.toLowerCase()}`}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs"
              />
              <button
                className="bo-link"
                onClick={() => {
                  const nextValue = drafts[section.key]?.trim();
                  if (!nextValue) return;
                  void addBrandVaultListItem(section.key, nextValue);
                  setDrafts((current) => ({ ...current, [section.key]: '' }));
                }}
              >
                Add
              </button>
            </div>

            <div className="space-y-2">
              {brandVault[section.key].map((item, index) => (
                <div key={`${section.key}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
                  <textarea
                    value={item}
                    rows={2}
                    onChange={(event) =>
                      void updateBrandVaultListItem(section.key, index, event.target.value)
                    }
                    className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1 text-xs"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      className="bo-link !px-2 !py-1"
                      onClick={() => void navigator.clipboard.writeText(item)}
                    >
                      <ClipboardCopy size={11} className="mr-1 inline" /> Copy
                    </button>
                    <button
                      disabled={index === 0}
                      className="bo-link !px-2 !py-1 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => void reorderBrandVaultListItem(section.key, index, index - 1)}
                    >
                      Move up
                    </button>
                    <button
                      disabled={index === brandVault[section.key].length - 1}
                      className="bo-link !px-2 !py-1 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => void reorderBrandVaultListItem(section.key, index, index + 1)}
                    >
                      Move down
                    </button>
                    <button
                      className="bo-link !px-2 !py-1"
                      onClick={() => void deleteBrandVaultListItem(section.key, index)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
