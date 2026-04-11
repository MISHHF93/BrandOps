import { useEffect } from 'react';
import { AppShell } from '../../app/layout/AppShell';
import { Card } from '../../app/components/Card';
import { SectionTitle } from '../../app/components/SectionTitle';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';

const stages = ['lead', 'discovery', 'proposal', 'active', 'closed'] as const;

export function DashboardApp() {
  const { data, init, moveOpportunity } = useBrandOpsStore();

  useEffect(() => {
    void init();
  }, [init]);

  if (!data) return null;

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">BrandOps Command Center</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <SectionTitle title="Content Studio" subtitle="Recent post drafts" />
          <ul className="space-y-2 text-sm">
            {data.posts.map((post) => (
              <li key={post.id} className="rounded-md border border-slate-700/50 p-2">
                <p className="text-slate-300">{post.idea}</p>
                <p className="line-clamp-3 text-xs text-slate-400">{post.text}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionTitle title="Outreach Assistant" subtitle="Recent collaboration messages" />
          <ul className="space-y-2 text-sm">
            {data.outreach.map((item) => (
              <li key={item.id} className="rounded-md border border-slate-700/50 p-2">
                <p>
                  {item.targetName} · <span className="text-slate-400">{item.targetRole}</span>
                </p>
                <p className="line-clamp-3 text-xs text-slate-400">{item.message}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <SectionTitle title="Opportunity CRM" subtitle="Track pipeline momentum" />
        <div className="grid gap-3 md:grid-cols-3">
          {data.opportunities.map((opportunity) => (
            <div key={opportunity.id} className="rounded-lg border border-slate-700/50 p-3">
              <h3 className="font-semibold">{opportunity.company}</h3>
              <p className="text-xs text-slate-400">{opportunity.contact}</p>
              <p className="mt-1 text-xs text-emerald-400">${opportunity.valueUsd.toLocaleString()}</p>
              <select
                value={opportunity.stage}
                className="mt-2 w-full rounded-md border border-slate-700 bg-[#0A1220] p-2 text-xs"
                onChange={(event) => void moveOpportunity(opportunity.id, event.target.value as any)}
              >
                {stages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
