import { useEffect } from 'react';
import { BrandHeader } from '../../shared/ui/BrandHeader';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';

export function OptionsApp() {
  const { data, init } = useBrandOpsStore();

  useEffect(() => {
    void init();
  }, [init]);

  if (!data) {
    return <div className="p-5">Loading settings…</div>;
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <BrandHeader subtitle="Settings and provider configuration foundation." />

      <section className="bo-card space-y-3">
        <h2 className="text-base font-semibold">Environment</h2>
        <p className="text-sm" style={{ color: 'hsl(var(--bo-text-muted))' }}>
          Provider: {data.settings.llmProvider}
        </p>
        <p className="text-sm" style={{ color: 'hsl(var(--bo-text-muted))' }}>
          Active profile: {data.settings.activePromptProfileId}
        </p>
      </section>
    </main>
  );
}
