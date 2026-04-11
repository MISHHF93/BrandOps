import { useEffect, useState } from 'react';
import { ArrowRight, Rocket, SendHorizonal } from 'lucide-react';
import { Card } from '../../app/components/Card';
import { SectionTitle } from '../../app/components/SectionTitle';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';

export function PopupApp() {
  const { data, init, generatePost, generateOutreach } = useBrandOpsStore();
  const [idea, setIdea] = useState('AI automation lesson from this week');

  useEffect(() => {
    void init();
  }, [init]);

  if (!data) return <div className="w-[420px] p-4 text-sm text-slate-300">Loading BrandOps…</div>;

  return (
    <div className="w-[420px] space-y-3 p-3">
      <Card>
        <SectionTitle title="Brand Memory" subtitle="Your current positioning" />
        <p className="text-sm text-slate-100">{data.brand.headline}</p>
        <p className="mt-2 text-xs text-slate-400">{data.brand.coreOffer}</p>
      </Card>

      <Card>
        <SectionTitle title="Content Studio" subtitle="Generate on-brand LinkedIn drafts" />
        <input
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          className="w-full rounded-md border border-slate-700 bg-[#0A1220] p-2 text-xs"
        />
        <button
          onClick={() => void generatePost(idea)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold"
        >
          <Rocket size={14} /> Generate Post
        </button>
        <p className="mt-2 line-clamp-3 text-xs text-slate-300">{data.posts[0]?.text}</p>
      </Card>

      <Card>
        <SectionTitle title="Outreach Assistant" subtitle="Draft a collaboration message" />
        <button
          onClick={() => void generateOutreach('Founder', 'AI Lead', 'start a collaboration chat')}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-violet-600 px-3 py-2 text-xs font-semibold"
        >
          <SendHorizonal size={14} /> Draft Outreach
        </button>
        <p className="mt-2 line-clamp-3 text-xs text-slate-300">{data.outreach[0]?.message}</p>
      </Card>

      <button
        onClick={() => chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' })}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-xs"
      >
        Open Full Dashboard <ArrowRight size={14} />
      </button>
    </div>
  );
}
