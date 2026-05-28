import type { RefObject } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Copy,
  History,
  User,
  Sparkles,
  Search
} from 'lucide-react';
import clsx from 'clsx';
import { AssistantEvidenceChips } from './AssistantEvidenceChips';
import { AssistantInlineCitationBody } from './AssistantInlineCitationBody';
import { AssistantTraceSummary } from './AssistantTraceSummary';
import { AgentWorkingState } from '../../shared/ui/brandopsPolish';
import { CHAT_QUICK_STARTER_GROUPS } from './chatCommandStarters';
import { getIntentByCommandLine } from './chatIntents';
import type {
  AiCitationChunk,
  CopilotWorkerRegistrySettings,
  DigitalTwin,
  TwinSupportedActionType
} from '../../types/domain';
import type { AssistantAskTraceSummaryUI } from '../../types/aiTraceGraph';
import { twinActionPrompt } from '../../services/digitalTwin/digitalTwin';
import type { PlatformAwareAskReadout } from '../../services/ai/platformAwareAskContext';
import type { BehavioralIntelligenceEngineReadout } from '../../services/intelligence/behavioralIntelligenceEngine';
import type {
  PredictiveOpportunityLayerReadout,
  PredictiveOpportunitySuggestion
} from '../../services/plan/predictiveOpportunityLayer';
import type {
  ContentIdeationItem,
  PredictiveContentIdeationReadout
} from '../../services/plan/predictiveContentIdeationEngine';
import type {
  WorkflowPrediction,
  WorkflowPredictionLayerReadout
} from '../../services/plan/workflowPredictionLayer';
import type { MemoryContextEngineReadout } from '../../services/memory/memoryContextEngine';
import { buildPredictiveAskPromptGroups } from './predictiveAskPrompts';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sourceSurface?: 'Workspace' | 'Today' | 'Integrations' | 'Settings' | 'Chat';
  action?: string;
  ok?: boolean;
  resultKind?: 'plain' | 'command-result' | 'ask-result';
  strip?: {
    notes: number;
    queue: number;
    followUps: number;
    opportunities: number;
  };
  /** Normalized citation envelope from hosted `ask:` responses (optional). */
  citations?: AiCitationChunk[];
  /** `[cite: …]` markers that did not match any citation row (optional). */
  orphanInlineMarkers?: string[];
  /** Compact provenance summary for this assistant turn (optional). */
  traceSummary?: AssistantAskTraceSummaryUI;
}

export type AskPlanConversionKind =
  | 'execution-plan'
  | 'workflow'
  | 'action-queue'
  | 'content-schedule'
  | 'outreach-draft'
  | 'follow-up-sequence';

const STARTER_CAP = 6;

const ASK_TO_PLAN_CONVERSIONS: ReadonlyArray<{
  kind: AskPlanConversionKind;
  label: string;
  description: string;
}> = [
  {
    kind: 'execution-plan',
    label: 'Convert to Plan',
    description: 'Create an executable PLAN card'
  },
  {
    kind: 'workflow',
    label: 'Workflow',
    description: 'Steps, dependencies, risks'
  },
  {
    kind: 'action-queue',
    label: 'Action queue',
    description: 'Prioritized operating queue'
  },
  {
    kind: 'content-schedule',
    label: 'Content schedule',
    description: 'Calendar and draft path'
  },
  {
    kind: 'outreach-draft',
    label: 'Outreach draft',
    description: 'Draft message for approval'
  },
  {
    kind: 'follow-up-sequence',
    label: 'Follow-ups',
    description: 'Sequence next touches'
  }
];

const ASSISTANT_QUICK_PICKS = (() => {
  const seen = new Set<string>();
  const out: string[] = [];
  const maxRound = Math.max(...CHAT_QUICK_STARTER_GROUPS.map((g) => g.commands.length), 0);
  for (let i = 0; i < maxRound && out.length < STARTER_CAP; i += 1) {
    for (const g of CHAT_QUICK_STARTER_GROUPS) {
      const c = g.commands[i];
      if (!c || seen.has(c)) continue;
      seen.add(c);
      out.push(c);
      if (out.length >= STARTER_CAP) return out;
    }
  }
  return out;
})();

function copyToClipboard(text: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
  void navigator.clipboard.writeText(text).catch(() => {});
}

export interface MobileChatViewProps {
  messages: ChatMessage[];
  loading: boolean;
  commandHistory: string[];
  onQuickCommand: (command: string) => void;
  copilotWorkerRegistry: CopilotWorkerRegistrySettings;
  onSelectCopilotWorker: (workerId: string) => void;
  onClearCommandHistory: () => void;
  btnFocus: string;
  /** Anchor for scroll-into-view while the shell main scrolls as one surface */
  transcriptEndRef?: RefObject<HTMLDivElement>;
  /** Open global command palette — same catalogue as Plan and ⌘K */
  onOpenCommandPalette?: () => void;
  /** Jump to Settings → operator twin résumé ingest (hosted Ask). */
  onOpenResumeGrounding?: () => void;
  /** One-line hosted routing stance — surfaced below Assistant headline (optional). */
  assistantRoutingCaption?: string;
  /** Active digital twin, if created from reviewed resume/profile data. */
  activeDigitalTwin?: DigitalTwin | null;
  /** Connected-app/workflow context readout that hosted ASK receives. */
  platformAwareAsk?: PlatformAwareAskReadout;
  /** Behavioral patterns from local recent actions and ASK/PLAN history. */
  behavioralIntelligenceEngine?: BehavioralIntelligenceEngineReadout;
  /** Predictive opportunities used to generate dynamic ASK starters. */
  predictiveOpportunityLayer?: PredictiveOpportunityLayerReadout;
  /** Predictive content ideation used to generate ASK to PLAN starters. */
  predictiveContentIdeationEngine?: PredictiveContentIdeationReadout;
  /** Repeated workflow predictions used to generate ASK to PLAN starters. */
  workflowPredictionLayer?: WorkflowPredictionLayerReadout;
  /** Persistent local memory used to personalize ASK suggestions. */
  memoryContextEngine?: MemoryContextEngineReadout;
  onTwinAction?: (actionType: TwinSupportedActionType, prompt: string) => void;
  onConvertPredictiveOpportunityToPlan?: (suggestion: PredictiveOpportunitySuggestion) => void;
  onConvertContentIdeationToPlan?: (item: ContentIdeationItem) => void;
  onConvertWorkflowPredictionToPlan?: (prediction: WorkflowPrediction) => void;
  onConvertAskToPlan?: (kind: AskPlanConversionKind, askOutput: string, messageId: string) => void;
}

/**
 * ASK tab — full-height conversational intelligence layout: one scroll container (shell `main`),
 * fixed composer below. Avoids nested transcript panes that trap touch / keyboard scroll.
 */
export const MobileChatView = ({
  messages,
  loading,
  commandHistory,
  onQuickCommand,
  copilotWorkerRegistry,
  onSelectCopilotWorker,
  onClearCommandHistory,
  btnFocus,
  transcriptEndRef,
  onOpenCommandPalette,
  onOpenResumeGrounding,
  assistantRoutingCaption,
  activeDigitalTwin,
  platformAwareAsk,
  behavioralIntelligenceEngine,
  predictiveOpportunityLayer,
  predictiveContentIdeationEngine,
  workflowPredictionLayer,
  memoryContextEngine,
  onTwinAction,
  onConvertPredictiveOpportunityToPlan,
  onConvertContentIdeationToPlan,
  onConvertWorkflowPredictionToPlan,
  onConvertAskToPlan
}: MobileChatViewProps) => {
  /** Matches hero inset — keeps Copilot / starters / transcript edges aligned. */
  const assistantGutter = 'px-3 sm:px-3.5';

  const twinMemoryFacts = activeDigitalTwin
    ? [
        ...activeDigitalTwin.memory.approvedClaims,
        ...activeDigitalTwin.memory.facts,
        ...activeDigitalTwin.resumeProfile.skills
      ].filter(Boolean)
    : [];
  const twinMemoryPreview = Array.from(new Set(twinMemoryFacts.map((item) => item.trim())))
    .filter(Boolean)
    .slice(0, 6);
  const verifiedDataCount = activeDigitalTwin
    ? new Set(
        [
          activeDigitalTwin.identity.headline,
          activeDigitalTwin.identity.professionalPositioning,
          ...activeDigitalTwin.resumeProfile.skills,
          ...activeDigitalTwin.resumeProfile.achievements,
          ...activeDigitalTwin.memory.approvedClaims
        ]
          .map((item) => item?.trim())
          .filter(Boolean)
      ).size
    : 0;
  const memoryUsageCount = activeDigitalTwin
    ? activeDigitalTwin.memory.facts.length +
      activeDigitalTwin.memory.preferences.length +
      activeDigitalTwin.memory.voiceExamples.length +
      activeDigitalTwin.memory.approvedClaims.length
    : 0;
  const platformConnected = platformAwareAsk?.connectedApps ?? [];
  const platformRecentActivityCount = platformAwareAsk?.recentActivity.length ?? 0;
  const platformWorkflowCount = platformAwareAsk?.workflowState.length ?? 0;
  const promptGroups = buildPredictiveAskPromptGroups({
    predictiveOpportunityLayer,
    predictiveContentIdeationEngine,
    workflowPredictionLayer,
    memoryContextEngine,
    behavioralIntelligenceEngine,
    activeDigitalTwin,
    platformAwareAsk,
    recentCommandLines: commandHistory
  });

  return (
    <div aria-label="ASK intelligence layer" className="bo-assistant-surface flex flex-col gap-3">
      <header className={clsx('bo-assistant-hero bo-dos-hero py-3 sm:py-3.5', assistantGutter)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-text">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-bgElevated text-accent">
                <Bot className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold leading-tight tracking-tight text-text">
                  ASK
                </h2>
                <p className="mt-0.5 text-meta leading-snug text-textMuted">
                  Ask your AI digital twin. It understands your profession identity, uses connected
                  platform context, and turns intelligence into plans.
                </p>
                <p className="mt-1 text-fine leading-snug text-textSoft">
                  ASK is not a chatbot thread. It is the intelligence layer before PLAN and OPERATE.
                </p>
                {assistantRoutingCaption?.trim() ? (
                  <p className="mt-1 text-fine leading-snug text-textSoft">
                    {assistantRoutingCaption}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          {onOpenCommandPalette ? (
            <nav aria-label="ASK shortcuts" className="flex shrink-0 items-start">
              <button
                type="button"
                onClick={onOpenCommandPalette}
                title="Open command palette (⌘K / Ctrl+K)"
                aria-label="Open command palette"
                className={clsx('bo-icon-btn-ai inline-flex items-center gap-1.5', btnFocus)}
              >
                <Search className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                <span className="hidden min-[380px]:inline text-meta font-semibold">⌘K</span>
              </button>
            </nav>
          ) : null}
        </div>
        {onOpenResumeGrounding ? (
          <p className="mt-2 text-fine leading-snug text-textSoft">
            <button
              type="button"
              onClick={onOpenResumeGrounding}
              className={clsx('bo-link bo-link--sm font-semibold !normal-case', btnFocus)}
            >
              Build or improve your AI twin
            </button>
            <span className="text-textMuted">
              {' '}
              — ingest resume/profile context so ASK can reason from your profession identity and
              proof; improves hosted{' '}
            </span>
            <span className="whitespace-nowrap font-mono text-fine text-textSoft">ask:</span>
            <span className="text-textMuted"> answers.</span>
          </p>
        ) : null}
        {activeDigitalTwin ? (
          <section
            className="mt-3 rounded-xl border border-primary/35 bg-primarySoft/15 p-3"
            aria-label="Active digital twin"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-label font-semibold text-text">
                  Active twin: {activeDigitalTwin.displayName}
                </p>
                <p className="text-fine text-textMuted">
                  {activeDigitalTwin.status} · {activeDigitalTwin.confidenceScore}% confidence ·
                  {activeDigitalTwin.memory.missingInfo.length
                    ? ' asks before missing facts'
                    : ' grounded in reviewed profile data'}
                </p>
              </div>
              <span className="rounded-full border border-border/50 bg-bgElevated px-2 py-1 text-fine font-semibold text-textMuted">
                Twin Context Mode
              </span>
            </div>
            <p className="mt-2 text-fine leading-snug text-textMuted">
              Safe output rule: BrandOps will not invent résumé claims. Missing facts should become
              follow-up questions before outreach or publishing.
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-1.5 text-fine sm:grid-cols-4">
              <div className="rounded-lg border border-border/35 bg-bgSubtle/50 px-2 py-1.5">
                <dt className="text-textSoft">Confidence score</dt>
                <dd className="font-semibold text-text">{activeDigitalTwin.confidenceScore}%</dd>
              </div>
              <div className="rounded-lg border border-border/35 bg-bgSubtle/50 px-2 py-1.5">
                <dt className="text-textSoft">Verified data usage</dt>
                <dd className="font-semibold text-text">{verifiedDataCount} facts</dd>
              </div>
              <div className="rounded-lg border border-border/35 bg-bgSubtle/50 px-2 py-1.5">
                <dt className="text-textSoft">Memory usage</dt>
                <dd className="font-semibold text-text">{memoryUsageCount} memories</dd>
              </div>
              <div className="rounded-lg border border-border/35 bg-bgSubtle/50 px-2 py-1.5">
                <dt className="text-textSoft">Clarification guardrail</dt>
                <dd className="font-semibold text-text">
                  {activeDigitalTwin.memory.missingInfo.length ? 'Ask first' : 'Grounded'}
                </dd>
              </div>
            </dl>
            <div className="mt-2 rounded-lg border border-border/35 bg-bgSubtle/45 px-2.5 py-2 text-fine leading-snug text-textMuted">
              <span className="font-semibold text-text">Twin influence:</span> voice, positioning,
              suggestions, workflows, opportunities, content direction, and outreach style inherit
              from the active twin. Missing facts trigger follow-up questions.
            </div>
            {twinMemoryPreview.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Twin memory preview">
                {twinMemoryPreview.map((fact) => (
                  <span
                    key={fact}
                    className="max-w-full rounded-full border border-border/40 bg-bgElevated/70 px-2 py-1 text-fine text-textMuted"
                    title={fact}
                  >
                    <span className="line-clamp-1">{fact}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
        <section
          className="mt-3 rounded-xl border border-border/45 bg-surface/45 p-3"
          aria-label="Platform-aware ASK"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-label font-semibold text-text">Platform-aware context</p>
              <p className="mt-1 text-fine leading-snug text-textMuted">
                ASK can reason over connected apps, recent activity, workflow state, and operational
                context. It must say when Gmail, Notion, Calendar, Slack, or LinkedIn data is not
                connected or approved.
              </p>
            </div>
            <span className="rounded-full border border-border/50 bg-bgElevated px-2 py-1 text-fine font-semibold text-textMuted">
              {platformConnected.length} apps visible
            </span>
          </div>
          <dl className="mt-2 grid grid-cols-3 gap-1.5 text-fine">
            <div className="rounded-lg border border-border/35 bg-bgSubtle/50 px-2 py-1.5">
              <dt className="text-textSoft">Connected apps</dt>
              <dd className="font-semibold text-text">{platformConnected.length}</dd>
            </div>
            <div className="rounded-lg border border-border/35 bg-bgSubtle/50 px-2 py-1.5">
              <dt className="text-textSoft">Recent activity</dt>
              <dd className="font-semibold text-text">{platformRecentActivityCount}</dd>
            </div>
            <div className="rounded-lg border border-border/35 bg-bgSubtle/50 px-2 py-1.5">
              <dt className="text-textSoft">Workflow state</dt>
              <dd className="font-semibold text-text">{platformWorkflowCount}</dd>
            </div>
          </dl>
          {platformConnected.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Connected apps visible to ASK">
              {platformConnected.slice(0, 8).map((app) => (
                <span
                  key={app}
                  className="rounded-full border border-border/35 bg-bgSubtle/60 px-2 py-1 text-fine text-textMuted"
                >
                  {app}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 rounded-lg border border-warning/30 bg-warningSoft/10 px-2.5 py-2 text-fine leading-snug text-warning">
              No connected app context is available yet. ASK can still use workspace state, but it
              should not claim access to external apps.
            </p>
          )}
        </section>
      </header>

      <div className={clsx('flex min-w-0 flex-col gap-3', assistantGutter)}>
        <section id="assistant-copilot" className="scroll-mt-28 min-w-0" aria-label="ASK copilot">
          <p className="bo-assistant-section-label">Strategist mode</p>
          <p className="mb-1.5 text-meta leading-snug text-textSoft">
            Pick a reasoning worker, then ask for strategy, positioning, content, outreach, or
            workflow judgment. Hosted calls require your configured OpenAI-compatible endpoint and
            key.
          </p>
          <p className="mb-1.5 rounded-lg border border-border/40 bg-bgSubtle/45 px-2 py-1.5 text-fine leading-snug text-textMuted">
            Structured response target: insight → evidence → recommendation → next action → save to
            Plan. Use <code className="rounded bg-bgSubtle px-1 py-px text-fine">ask: …</code> in
            the composer for hosted reasoning.
          </p>
          <div className="bo-copilot-rail">
            {copilotWorkerRegistry.workers.map((w) => {
              const active = copilotWorkerRegistry.activeWorkerId === w.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  title={w.description ?? w.name}
                  aria-pressed={active}
                  onClick={() => onSelectCopilotWorker(w.id)}
                  className={clsx('bo-copilot-chip', active && 'bo-copilot-chip--active', btnFocus)}
                >
                  {w.name}
                </button>
              );
            })}
          </div>
        </section>

        <div id="assistant-commands" className="scroll-mt-28 space-y-3">
          <section aria-labelledby="ask-prompts-label" className="min-w-0">
            <p id="ask-prompts-label" className="bo-assistant-section-label">
              Predictive prompts
            </p>
            <p className="mt-1 text-meta leading-snug text-textSoft">
              Dynamic starters based on recent behavior, profession context, connected platforms,
              behavioral history, and memory patterns.
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {promptGroups.map((group) => (
                <section
                  key={group.id}
                  className="rounded-xl border border-border/45 bg-surface/45 p-2.5"
                  aria-label={`${group.label} prompts`}
                >
                  <p className="text-label font-semibold text-text">{group.label}</p>
                  <div className="mt-2 grid gap-1.5">
                    {group.prompts.map((prompt) => (
                      <article
                        key={prompt.id}
                        className={clsx(
                          'rounded-lg border border-border/35 bg-bgSubtle/55 p-2 text-meta leading-snug text-textMuted',
                          'hover:border-borderStrong'
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => onQuickCommand(prompt.command)}
                          className={clsx('w-full text-left', btnFocus)}
                          title={`${prompt.why} · ${prompt.confidence}% confidence`}
                        >
                          <span className="block text-label font-semibold text-text">
                            {prompt.prompt}
                          </span>
                          <span className="mt-1 line-clamp-2 block text-fine leading-snug text-textSoft">
                            {prompt.why}
                          </span>
                        </button>
                        <span className="mt-1 inline-flex rounded-full border border-border/35 bg-bgElevated px-1.5 py-0.5 text-overline font-bold uppercase text-textMuted">
                          {prompt.confidence}% confidence
                        </span>
                        {prompt.sourceSuggestion && onConvertPredictiveOpportunityToPlan ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (prompt.sourceSuggestion) {
                                onConvertPredictiveOpportunityToPlan(prompt.sourceSuggestion);
                              }
                            }}
                            className={clsx(
                              'mt-2 block rounded-lg border border-primary/35 bg-primarySoft/15 px-2 py-1.5 text-left text-fine font-semibold text-primary',
                              btnFocus
                            )}
                          >
                            Convert this into a reusable operational plan
                          </button>
                        ) : null}
                        {prompt.sourceContentIdeation && onConvertContentIdeationToPlan ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (prompt.sourceContentIdeation) {
                                onConvertContentIdeationToPlan(prompt.sourceContentIdeation);
                              }
                            }}
                            className={clsx(
                              'mt-2 block rounded-lg border border-primary/35 bg-primarySoft/15 px-2 py-1.5 text-left text-fine font-semibold text-primary',
                              btnFocus
                            )}
                          >
                            Convert ideation directly to PLAN
                          </button>
                        ) : null}
                        {prompt.sourceWorkflowPrediction && onConvertWorkflowPredictionToPlan ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (prompt.sourceWorkflowPrediction) {
                                onConvertWorkflowPredictionToPlan(prompt.sourceWorkflowPrediction);
                              }
                            }}
                            className={clsx(
                              'mt-2 block rounded-lg border border-primary/35 bg-primarySoft/15 px-2 py-1.5 text-left text-fine font-semibold text-primary',
                              btnFocus
                            )}
                          >
                            Convert workflow directly to PLAN
                          </button>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>

          {activeDigitalTwin && onTwinAction ? (
            <section aria-labelledby="assistant-twin-actions-label" className="min-w-0">
              <p id="assistant-twin-actions-label" className="bo-assistant-section-label">
                Actionable outputs
              </p>
              <p className="mt-1 text-meta leading-snug text-textSoft">
                Generate structured outputs from twin memory, then confirm before sending,
                publishing, or saving externally.
              </p>
              <div className="bo-assistant-quick-strip mt-1.5">
                {(
                  [
                    ['generate_professional_bio', 'Generate bio'],
                    ['draft_outreach', 'Draft outreach'],
                    ['create_30_day_content_plan', '30-day content plan'],
                    ['improve_profile_gaps', 'Improve profile gaps']
                  ] as const
                ).map(([actionType, label]) => {
                  const prompt = twinActionPrompt(actionType, activeDigitalTwin);
                  return (
                    <button
                      key={actionType}
                      type="button"
                      onClick={() => onTwinAction(actionType, prompt)}
                      className={clsx('bo-chat-starter-chip touch-manipulation', btnFocus)}
                      title="Preview in Chat; external sending or posting requires explicit approval."
                    >
                      <span className="line-clamp-1">{label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}
          <section aria-labelledby="assistant-starters-label" className="min-w-0">
            <p id="assistant-starters-label" className="bo-assistant-section-label">
              Execution shortcuts
            </p>
            <p className="mt-1 text-meta leading-snug text-textSoft">
              These are real BrandOps actions. Use them when a strategy is ready to become workspace
              execution.
            </p>
            <div className="bo-assistant-quick-strip mt-1.5">
              {ASSISTANT_QUICK_PICKS.map((command) => {
                const meta = getIntentByCommandLine(command);
                const label = meta?.title ?? command;
                return (
                  <button
                    key={command}
                    type="button"
                    onClick={() => onQuickCommand(command)}
                    title={meta ? `${meta.title} — ${meta.subtitle}` : command}
                    className={clsx('bo-chat-starter-chip touch-manipulation', btnFocus)}
                  >
                    <span className="line-clamp-1">{label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <section
          id="assistant-thread"
          className="bo-assistant-thread-shell scroll-mt-28 min-w-0 py-3 sm:py-3.5"
          aria-label="ASK transcript and recent prompts"
        >
          <h3 className="sr-only">ASK conversation transcript</h3>
          <div
            className="flex flex-col gap-3"
            role="log"
            aria-relevant="additions"
            aria-live="polite"
            aria-atomic="false"
          >
            {commandHistory.length > 0 ? (
              <div className="pb-3" aria-label="Recent ASK prompts and commands">
                <div className="flex items-center justify-between gap-2">
                  <span className="bo-assistant-recents-label">
                    <History className="h-3 w-3" strokeWidth={2} aria-hidden />
                    Recent
                  </span>
                  <button
                    type="button"
                    className={clsx('bo-assistant-recents-clear', btnFocus)}
                    onClick={onClearCommandHistory}
                  >
                    Clear
                  </button>
                </div>
                <div className="bo-copilot-rail mt-1.5">
                  {commandHistory.slice(0, 12).map((cmd) => (
                    <button
                      key={cmd}
                      type="button"
                      onClick={() => onQuickCommand(cmd)}
                      className={clsx('bo-chat-history-chip', btnFocus)}
                      title={cmd}
                    >
                      {cmd.length > 48 ? `${cmd.slice(0, 46)}…` : cmd}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border/60 bg-bgSubtle/55 px-3 py-12 text-center sm:px-4 sm:py-14">
                <span className="bo-assistant-empty-state-icon">
                  <Sparkles className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <p className="text-sm font-semibold text-text">
                  Ask your AI strategist and operator
                </p>
                <p className="max-w-[min(100%,22rem)] text-meta leading-relaxed text-textMuted">
                  Ask for brainstorming, profile understanding, positioning, bios, opportunity
                  analysis, content ideas, outreach drafts, workflow reasoning, or strategic next
                  moves. Lines beginning with{' '}
                  <span className="font-mono text-meta text-textSoft">ask:</span> use the hosted
                  model when configured.
                </p>
                <p className="max-w-[min(100%,22rem)] text-fine leading-relaxed text-textSoft">
                  Try:{' '}
                  <span className="font-mono">ask: what is my strongest positioning angle?</span> or{' '}
                  <span className="font-mono">ask: turn this idea into an executable plan</span>.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <article
                  key={message.id}
                  className={clsx(
                    'flex gap-2.5',
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <span
                    className={clsx(
                      'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-fine font-bold',
                      message.role === 'user'
                        ? 'bg-surfaceActive text-text'
                        : 'bg-accentSoft/35 text-accent'
                    )}
                    aria-hidden
                  >
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" strokeWidth={2.25} />
                    ) : (
                      <Bot className="h-4 w-4" strokeWidth={2.25} />
                    )}
                  </span>
                  <div
                    className={clsx(
                      'min-w-0 flex-1',
                      message.role === 'user' ? 'flex justify-end' : ''
                    )}
                  >
                    {message.role === 'user' ? (
                      <div className="bo-chat-bubble-user">
                        {message.sourceSurface && message.sourceSurface !== 'Chat' ? (
                          <p className="mb-1 text-overline font-bold uppercase opacity-80">
                            {message.sourceSurface}
                          </p>
                        ) : null}
                        <p className="whitespace-pre-wrap break-words">{message.text}</p>
                      </div>
                    ) : message.resultKind === 'ask-result' ? (
                      <div className="bo-chat-bubble-assistant space-y-1">
                        <p className="bo-chat-meta-label">Hosted model</p>
                        {typeof message.ok === 'boolean' && !message.ok ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-warningSoft px-1.5 py-0.5 text-overline font-bold uppercase text-warning">
                            <AlertCircle size={11} aria-hidden />
                            Unavailable
                          </span>
                        ) : null}
                        {message.ok !== false ? (
                          <>
                            <AssistantInlineCitationBody
                              text={message.text}
                              citations={message.citations ?? []}
                              messageAnchorPrefix={message.id}
                              btnFocus={btnFocus}
                            />
                            {message.orphanInlineMarkers?.length ? (
                              <p className="text-fine leading-snug text-warning" role="status">
                                Unresolved citation markers (no matching provenance row):{' '}
                                <span className="font-mono font-semibold">
                                  {message.orphanInlineMarkers.join(', ')}
                                </span>
                              </p>
                            ) : null}
                            {message.citations?.length ? (
                              <AssistantEvidenceChips
                                citations={message.citations}
                                anchorPrefix={message.id}
                                btnFocus={btnFocus}
                              />
                            ) : null}
                            {message.traceSummary ? (
                              <AssistantTraceSummary
                                summary={message.traceSummary}
                                orphanMarkerCount={message.orphanInlineMarkers?.length ?? 0}
                                btnFocus={btnFocus}
                              />
                            ) : null}
                            {onConvertAskToPlan ? (
                              <section
                                className="mt-2 rounded-xl border border-primary/30 bg-primarySoft/10 p-2"
                                aria-label="Convert ASK output to PLAN"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-label font-semibold text-text">
                                      Convert to Plan
                                    </p>
                                    <p className="mt-0.5 text-fine leading-snug text-textMuted">
                                      Ask → Plan → Approve → Execute. Create a PLAN card or launch a
                                      real workspace action from this output.
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                                  {ASK_TO_PLAN_CONVERSIONS.map((item) => (
                                    <button
                                      key={item.kind}
                                      type="button"
                                      onClick={() =>
                                        onConvertAskToPlan(item.kind, message.text, message.id)
                                      }
                                      className={clsx(
                                        'rounded-lg border border-border/40 bg-bgElevated/65 px-2.5 py-2 text-left text-meta text-text hover:border-borderStrong',
                                        btnFocus
                                      )}
                                      title={item.description}
                                    >
                                      <span className="block font-semibold">{item.label}</span>
                                      <span className="mt-0.5 block text-fine font-normal leading-snug text-textMuted">
                                        {item.description}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </section>
                            ) : null}
                          </>
                        ) : (
                          <p className="whitespace-pre-wrap break-words leading-relaxed">
                            {message.text}
                          </p>
                        )}
                      </div>
                    ) : message.resultKind === 'command-result' && message.action ? (
                      <div className="bo-chat-bubble-meta space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {message.ok ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-successSoft px-1.5 py-0.5 text-overline font-bold uppercase text-success">
                              <CheckCircle2 size={11} aria-hidden />
                              Ok
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-warningSoft px-1.5 py-0.5 text-overline font-bold uppercase text-warning">
                              <AlertCircle size={11} aria-hidden />
                              Issue
                            </span>
                          )}
                          <code className="rounded-md bg-bgSubtle px-1.5 py-0.5 text-fine text-info">
                            {message.action}
                          </code>
                          {message.sourceSurface && message.sourceSurface !== 'Chat' ? (
                            <span className="text-overline text-textSoft">
                              {message.sourceSurface}
                            </span>
                          ) : null}
                          <button
                            type="button"
                            className={clsx(
                              'ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-bgElevated text-textSoft hover:bg-surfaceActive hover:text-text',
                              btnFocus
                            )}
                            title="Copy"
                            aria-label="Copy command output"
                            onClick={() =>
                              copyToClipboard(
                                `${message.action}\n${message.text}${message.strip ? `\n${JSON.stringify(message.strip)}` : ''}`
                              )
                            }
                          >
                            <Copy size={14} aria-hidden />
                          </button>
                        </div>
                        <p className="whitespace-pre-wrap break-words leading-relaxed text-text">
                          {message.text}
                        </p>
                      </div>
                    ) : (
                      <div className="bo-chat-bubble-assistant">
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          {message.text}
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              ))
            )}
            {loading ? (
              <div className="pt-1">
                <AgentWorkingState />
              </div>
            ) : null}
            <div ref={transcriptEndRef} className="h-1 w-full shrink-0 scroll-mt-24" aria-hidden />
          </div>
        </section>
      </div>
    </div>
  );
};
