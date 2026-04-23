import { knowledgeCenterDailyPlaybook, knowledgeCenterTopics } from './knowledgeCenterTopics';
import { KnowledgeTopicIcon } from './knowledgeCenterTopicIcons';
import { QUERY } from '../navigation/extensionLinks';

export type KnowledgeCenterBodyProps = {
  /** Full help page uses `?topic=`; embedded overlay uses in-panel `#` jumps. */
  topicLinkMode: 'page-query' | 'embedded-hash';
};

export function KnowledgeCenterBody({ topicLinkMode }: KnowledgeCenterBodyProps) {
  const playbook = knowledgeCenterDailyPlaybook;

  const topicHref = (topicId: string) =>
    topicLinkMode === 'page-query'
      ? `?${QUERY.helpTopic}=${encodeURIComponent(topicId)}`
      : `#${topicId}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section
        aria-labelledby="kc-daily-heading"
        className="bo-card space-y-4 border border-primary/30 bg-bg/70 p-4 md:p-5"
      >
        <header className="space-y-1.5">
          <p className="bo-pill">Start here</p>
          <h2 id="kc-daily-heading" className="text-lg font-semibold text-text">
            {playbook.title}
          </h2>
          <p className="max-w-prose text-sm text-textMuted">{playbook.intro}</p>
        </header>
        <ol className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
          {playbook.steps.map((step, index) => (
            <li
              key={step.title}
              className="bo-retro-card rounded-2xl border border-border bg-bg/45 p-3.5"
            >
              <p className="text-[11px] uppercase tracking-[0.12em] text-textSoft">
                Step {index + 1}
              </p>
              <p className="mt-1.5 text-sm font-semibold text-text">{step.title}</p>
              <p className="mt-1.5 max-w-prose text-xs text-textMuted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="kc-reference-heading" className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="kc-reference-heading" className="text-base font-semibold text-text">
              Reference
            </h2>
            <p className="mt-0.5 text-xs text-textMuted">
              Pick a topic, then expand only if you need more detail.
            </p>
          </div>
        </div>

        <nav
          aria-label="Knowledge Center topics"
          className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs"
        >
          {knowledgeCenterTopics.map((topic) => (
            <a
              key={topic.id}
              className="bo-link inline-flex items-center gap-1.5 !py-0.5"
              href={topicHref(topic.id)}
            >
              <KnowledgeTopicIcon topicId={topic.id} size={14} />
              {topic.title}
            </a>
          ))}
        </nav>

        <div className="grid gap-4 md:grid-cols-2">
          {knowledgeCenterTopics.map((topic) => {
            const preview =
              topic.summary ??
              (topic.paragraphs[0] ? topic.paragraphs[0].split(/(?<=[.!?])\s+/)[0] : '');

            return (
              <article
                key={topic.id}
                id={topic.id}
                className="bo-card scroll-mt-24 space-y-2.5 p-4"
              >
                <h2 className="flex items-center gap-2 text-base font-semibold text-text">
                  <KnowledgeTopicIcon topicId={topic.id} size={18} />
                  {topic.title}
                </h2>
                {preview ? <p className="text-sm text-textMuted">{preview}</p> : null}
                <details className="group rounded-xl border border-border/80 bg-bg/35 p-2.5">
                  <summary className="cursor-pointer list-none text-sm font-medium text-text [&::-webkit-details-marker]:hidden">
                    <span className="underline decoration-border underline-offset-2 group-open:no-underline">
                      Show full guide
                    </span>
                  </summary>
                  <div className="mt-3 max-w-prose space-y-2.5 border-t border-border/60 pt-3">
                    {topic.paragraphs.map((paragraph, index) => (
                      <p key={index} className="text-sm text-textMuted">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
