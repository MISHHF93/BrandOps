import { useEffect, useRef, useState } from 'react';
import { BrandHeader } from '../../shared/ui/BrandHeader';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';

const downloadJson = (filename: string, payload: string) => {
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export function OptionsApp() {
  const { data, init, error, exportWorkspace, importWorkspace } = useBrandOpsStore();
  const [importText, setImportText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void init();
  }, [init]);

  if (error) {
    return <div className="p-5 text-sm text-rose-300">Settings failed to load: {error}</div>;
  }

  if (!data) {
    return <div className="p-5">Loading settings…</div>;
  }

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <BrandHeader subtitle="Local-first settings, backup tools, and automation controls." />

      <section className="bo-card space-y-2">
        <h2 className="text-base font-semibold">Local-first runtime</h2>
        <p className="text-sm text-slate-400">AI mode: {data.settings.aiAdapterMode}</p>
        <p className="text-sm text-slate-400">Timezone: {data.settings.timezone}</p>
        <p className="text-sm text-slate-400">Overlay: {data.settings.overlay.enabled ? 'Enabled' : 'Disabled'} / Compact: {data.settings.overlay.compactMode ? 'On' : 'Off'}</p>
      </section>

      <section className="bo-card space-y-3">
        <h2 className="text-base font-semibold">Automation rules</h2>
        <div className="grid gap-2 md:grid-cols-2">
          {data.settings.automationRules.map((rule) => (
            <article key={rule.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm">
              <p className="font-medium">{rule.name}</p>
              <p className="text-xs text-slate-400">Trigger: {rule.trigger} / Action: {rule.action}</p>
              <span className="bo-pill mt-2">{rule.enabled ? 'Enabled' : 'Disabled'}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="bo-card space-y-3">
        <h2 className="text-base font-semibold">Full data backup (all user data)</h2>
        <p className="text-xs text-slate-400">Includes brand profile, vault, content, publishing queue, outreach, CRM, notes, settings, and scheduler state.</p>
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
            Copy JSON
          </button>
          <button
            className="bo-link"
            onClick={() =>
              void (async () => {
                const exported = await exportWorkspace();
                downloadJson(`brandops-workspace-${new Date().toISOString().slice(0, 10)}.json`, exported);
                setNotice('Workspace JSON downloaded.');
              })()
            }
          >
            Download JSON file
          </button>
          <button className="bo-link" onClick={() => fileInputRef.current?.click()}>
            Import JSON file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void file.text().then((text) => setImportText(text));
            }}
          />
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
            Import JSON text
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
