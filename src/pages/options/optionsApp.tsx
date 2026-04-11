import { useEffect, useState } from 'react';
import { BrandHeader } from '../../shared/ui/BrandHeader';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';

export function OptionsApp() {
  const { data, init, exportWorkspace, importWorkspace } = useBrandOpsStore();
  const [importText, setImportText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void init();
  }, [init]);

  if (!data) {
    return <div className="p-5">Loading settings…</div>;
  }

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <BrandHeader subtitle="Settings, local automation rules, export/import, and extension preferences." />

      <section className="bo-card space-y-2">
        <h2 className="text-base font-semibold">Local-first runtime</h2>
        <p className="text-sm text-slate-400">AI mode: {data.settings.aiAdapterMode}</p>
        <p className="text-sm text-slate-400">Timezone: {data.settings.timezone}</p>
        <p className="text-sm text-slate-400">
          Overlay: {data.settings.overlay.enabled ? 'Enabled' : 'Disabled'} / Compact:{' '}
          {data.settings.overlay.compactMode ? 'On' : 'Off'}
        </p>
      </section>

      <section className="bo-card space-y-3">
        <h2 className="text-base font-semibold">Automation rules</h2>
        <div className="grid gap-2 md:grid-cols-2">
          {data.settings.automationRules.map((rule) => (
            <article
              key={rule.id}
              className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm"
            >
              <p className="font-medium">{rule.name}</p>
              <p className="text-xs text-slate-400">
                Trigger: {rule.trigger} / Action: {rule.action}
              </p>
              <span className="bo-pill mt-2">{rule.enabled ? 'Enabled' : 'Disabled'}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="bo-card space-y-3">
        <h2 className="text-base font-semibold">Export / Import Workspace</h2>
        <div className="flex flex-wrap gap-2">
          <button
            className="bo-link"
            onClick={() =>
              void (async () => {
                const exported = await exportWorkspace();
                await navigator.clipboard.writeText(exported);
                setNotice('Workspace JSON copied to clipboard.');
              })()
            }
          >
            Export to clipboard
          </button>
          <button
            className="bo-link"
            onClick={() =>
              void (async () => {
                if (!importText.trim()) return;
                await importWorkspace(importText);
                setImportText('');
                setNotice('Workspace imported successfully.');
              })()
            }
          >
            Import JSON
          </button>
        </div>

        <textarea
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          rows={8}
          placeholder="Paste exported BrandOps JSON here"
          className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs"
        />
        {notice ? <p className="text-xs text-emerald-300">{notice}</p> : null}
      </section>
    </main>
  );
}
