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
  const {
    data,
    init,
    error,
    exportWorkspace,
    importWorkspace,
    resetDemoData,
    setDebugMode,
    generateMockActivityBurst
  } = useBrandOpsStore();
  const [importText, setImportText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [failureNotice, setFailureNotice] = useState<string | null>(null);
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
                try {
                  const exported = await exportWorkspace();
                  await navigator.clipboard.writeText(exported);
                  setFailureNotice(null);
                  setNotice('Workspace JSON copied to clipboard.');
                } catch (copyError) {
                  setNotice(null);
                  setFailureNotice(`Copy failed: ${(copyError as Error).message}`);
                }
              })()
            }
          >
            Copy JSON
          </button>
          <button
            className="bo-link"
            onClick={() =>
              void (async () => {
                try {
                  const exported = await exportWorkspace();
                  downloadJson(`brandops-workspace-${new Date().toISOString().slice(0, 10)}.json`, exported);
                  setFailureNotice(null);
                  setNotice('Workspace JSON downloaded.');
                } catch (downloadError) {
                  setNotice(null);
                  setFailureNotice(`Download failed: ${(downloadError as Error).message}`);
                }
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
              void file
                .text()
                .then((text) => setImportText(text))
                .catch(() => {
                  setImportText('');
                  setNotice(null);
                  setFailureNotice('Unable to read selected file. Please select a valid JSON file.');
                });
            }}
          />
          <button
            className="bo-link"
            onClick={() =>
              void (async () => {
                try {
                  if (!importText.trim()) {
                    setFailureNotice('Import text cannot be empty.');
                    return;
                  }
                  await importWorkspace(importText);
                  setImportText('');
                  setFailureNotice(null);
                  setNotice('Workspace imported successfully.');
                } catch (importError) {
                  setNotice(null);
                  setFailureNotice(`Import failed: ${(importError as Error).message}`);
                }
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
        {failureNotice ? <p className="text-xs text-rose-300">{failureNotice}</p> : null}
      </section>

      <section className="bo-card space-y-3">
        <h2 className="text-base font-semibold">Developer tools</h2>
        <p className="text-xs text-slate-400">
          Use these controls to test first-launch flows, QA edge-cases, and seed/demo restoration.
        </p>
        <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm">
          <span>Debug mode</span>
          <input
            type="checkbox"
            checked={data.settings.debugMode}
            onChange={(event) =>
              void (async () => {
                await setDebugMode(event.target.checked);
                setFailureNotice(null);
                setNotice(`Debug mode ${event.target.checked ? 'enabled' : 'disabled'}.`);
              })()
            }
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            className="bo-link"
            onClick={() =>
              void (async () => {
                await generateMockActivityBurst();
                setFailureNotice(null);
                setNotice('Mock activity burst generated.');
              })()
            }
          >
            Generate mock activity burst
          </button>
          <button
            className="bo-link"
            onClick={() =>
              void (async () => {
                const confirmed = window.confirm(
                  'Reset workspace to demo seed data? This overwrites all current local data.'
                );
                if (!confirmed) return;
                await resetDemoData();
                setFailureNotice(null);
                setNotice('Workspace reset to seeded demo data.');
              })()
            }
          >
            Reset to demo seed
          </button>
        </div>
      </section>
    </main>
  );
}
