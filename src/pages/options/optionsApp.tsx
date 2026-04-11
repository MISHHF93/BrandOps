import { useEffect } from 'react';
import { AppShell } from '../../app/layout/AppShell';
import { Card } from '../../app/components/Card';
import { SectionTitle } from '../../app/components/SectionTitle';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';

export function OptionsApp() {
  const { data, init, updateHeadline, updateSettings } = useBrandOpsStore();

  useEffect(() => {
    void init();
  }, [init]);

  if (!data) return null;

  return (
    <AppShell>
      <Card>
        <SectionTitle title="Profile Settings" subtitle="Personalize your operating system" />
        <label className="text-xs text-slate-400">Headline</label>
        <input
          value={data.brand.headline}
          onChange={(event) => void updateHeadline(event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-700 bg-[#0A1220] p-2 text-sm"
        />
      </Card>

      <Card>
        <SectionTitle title="Prompt Profiles" subtitle="Future-ready LLM adapter controls" />
        <label className="text-xs text-slate-400">Provider</label>
        <select
          value={data.settings.llmProvider}
          onChange={(event) => void updateSettings({ llmProvider: event.target.value as any })}
          className="mt-1 rounded-md border border-slate-700 bg-[#0A1220] p-2 text-sm"
        >
          <option value="local">Local template</option>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="custom">Custom endpoint</option>
        </select>
      </Card>

      <Card>
        <SectionTitle title="Data" subtitle="Export/import placeholder for local-first roadmap" />
        <p className="text-sm text-slate-300">All data stays in chrome.storage.local in MVP mode.</p>
      </Card>
    </AppShell>
  );
}
