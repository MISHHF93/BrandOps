import { useEffect } from 'react';
import { BrandHeader } from '../../shared/ui/BrandHeader';
import { ModuleCard } from '../../shared/ui/ModuleCard';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';

export function DashboardApp() {
  const { data, init } = useBrandOpsStore();

  useEffect(() => {
    void init();
  }, [init]);

  if (!data) {
    return <div className="p-5">Loading dashboard…</div>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <BrandHeader subtitle="Dashboard surface for operational planning and execution." />

      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {data.modules.map((module) => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </section>
    </main>
  );
}
