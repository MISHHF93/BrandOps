import type { AppSettings } from '../../types/domain';
import type {
  AiOperatorMode,
  AIModelCapability,
  AITaskType,
  AIRoutingPolicy
} from '../../types/aiIntegrationSuite';

const ROUTING_SCHEMA_VERSION = '1.0.0';

export type HostedAssistantRoutingResolution = {
  schema_version: string;
  modelId: string;
  maxTokens?: number;
  temperature?: number;
  taskType: AITaskType;
  policy: AIRoutingPolicy;
  /** Always-on behavioral hint from operator mode (short). */
  behaviorHint: string;
  /** Longer rationale — inject only when aiRoutingDiagnosticsEnabled. */
  diagnosticsDetail?: string;
};

function clip(s: string, max: number) {
  const t = s.trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Heuristic capability profile from a hosted OpenAI-style model id (no network). */
export function inferCapabilityFromModelId(modelId: string): AIModelCapability {
  const m = modelId.toLowerCase();
  const cap: AIModelCapability = {
    latency_score: 0.55,
    cost_score: 0.45,
    reliability_score: 0.75,
    structured_output: 0.7,
    citation_support: 0.55
  };
  if (m.includes('mini') || m.includes('nano') || m.includes('haiku') || m.includes('flash')) {
    cap.reasoning = 0.48;
    cap.drafting = 0.62;
    cap.summarization = 0.78;
    cap.latency_score = 0.9;
    cap.cost_score = 0.88;
    cap.citation_support = 0.5;
  } else if (
    m.includes('gpt-4') ||
    m.includes('o1') ||
    m.includes('opus') ||
    m.includes('sonnet')
  ) {
    cap.reasoning = 0.9;
    cap.drafting = 0.85;
    cap.summarization = 0.72;
    cap.governance_review = 0.8;
    cap.hallucination_check = 0.72;
    cap.citation_support = 0.85;
    cap.structured_output = 0.86;
    cap.latency_score = 0.45;
    cap.cost_score = 0.28;
  } else if (m.includes('embedding')) {
    cap.embeddings = 0.95;
    cap.reasoning = 0.1;
  } else {
    cap.reasoning = 0.65;
    cap.drafting = 0.7;
    cap.summarization = 0.68;
  }
  if (m.includes('vision') || m.includes('4o') || m.includes('claude-3')) {
    cap.vision = Math.max(cap.vision ?? 0, 0.72);
  }
  if (m.includes('whisper') || m.includes('audio')) {
    cap.audio = Math.max(cap.audio ?? 0, 0.78);
  }
  if (m.includes('ollama') || m.includes('llama') || m.includes('local')) {
    cap.local_offline = Math.max(cap.local_offline ?? 0, 0.9);
  }
  return cap;
}

function routingPolicyForMode(mode: AiOperatorMode): AIRoutingPolicy {
  switch (mode) {
    case 'fast':
      return {
        policy_id: 'mode-fast',
        label: 'Fast — prioritize latency/cost',
        mode,
        primary_task: 'hosted_assistant',
        weights: {
          latency_score: 0.42,
          cost_score: 0.33,
          reasoning: 0.15,
          citation_support: 0.1
        },
        fallback_priority: ['gpt-4o-mini', 'mini', 'flash']
      };
    case 'deep_reasoning':
      return {
        policy_id: 'mode-deep',
        label: 'Deep reasoning — prioritize analysis depth',
        mode,
        primary_task: 'reasoning',
        weights: {
          reasoning: 0.52,
          governance_review: 0.15,
          citation_support: 0.13,
          structured_output: 0.12,
          latency_score: 0.08
        },
        fallback_priority: ['gpt-4o', 'o1', 'opus']
      };
    case 'private_local':
      return {
        policy_id: 'mode-private',
        label: 'Private/local preference — concise grounded answers',
        mode,
        primary_task: 'local_offline_task',
        weights: {
          local_offline: 0.55,
          cost_score: 0.2,
          latency_score: 0.15,
          citation_support: 0.1
        },
        fallback_priority: ['local', 'small', 'mini']
      };
    case 'best_evidence':
      return {
        policy_id: 'mode-evidence',
        label: 'Best evidence — prioritize citations + structured provenance',
        mode,
        primary_task: 'source_grounded_answer',
        weights: {
          citation_support: 0.46,
          structured_output: 0.22,
          reasoning: 0.18,
          rag_retrieval: 0.14
        },
        fallback_priority: ['gpt-4o', 'sonnet']
      };
    case 'balanced':
    default:
      return {
        policy_id: 'mode-balanced',
        label: 'Balanced — general assistant defaults',
        mode: 'balanced',
        primary_task: 'hosted_assistant',
        weights: {
          reasoning: 0.24,
          drafting: 0.2,
          citation_support: 0.18,
          latency_score: 0.18,
          cost_score: 0.12,
          reliability_score: 0.08
        },
        fallback_priority: ['balanced']
      };
  }
}

function scoreCapability(cap: AIModelCapability, weights: AIRoutingPolicy['weights']): number {
  let sum = 0;
  let wsum = 0;
  const entries = Object.entries(weights) as Array<[keyof AIModelCapability, number]>;
  for (const [k, w] of entries) {
    if (typeof w !== 'number' || !Number.isFinite(w)) continue;
    const v = cap[k];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    sum += v * w;
    wsum += w;
  }
  return wsum > 0 ? sum / wsum : 0.5;
}

export function suggestAlternateModelIds(primaryId: string, mode: AiOperatorMode): string[] {
  const m = primaryId.toLowerCase();
  const out: string[] = [];
  if (mode === 'fast') {
    if (m.includes('gpt-4o') && !m.includes('mini')) out.push('gpt-4o-mini');
    if (!m.includes('mini')) out.push('gpt-4o-mini');
  }
  if (mode === 'deep_reasoning' || mode === 'best_evidence') {
    if (m.includes('mini')) out.push('gpt-4o');
    if (!m.includes('gpt-4')) out.push('gpt-4o');
  }
  if (mode === 'private_local') {
    out.push('llama3.2-local');
  }
  return [...new Set(out.map((x) => x.trim()).filter(Boolean))];
}

export function resolveHostedAssistantRouting(args: {
  settings: AppSettings;
  workerModelId?: string | null;
}): HostedAssistantRoutingResolution {
  const { settings } = args;
  const policy = routingPolicyForMode(settings.aiOperatorMode);
  const worker = args.workerModelId?.trim();
  const baseBridge = settings.aiBridge.chatModelId.trim() || 'gpt-4o-mini';
  const primaryCandidate = worker || baseBridge;
  const extra = suggestAlternateModelIds(primaryCandidate, settings.aiOperatorMode);
  const candidateIds = [...new Set([primaryCandidate, ...extra, baseBridge])].filter(Boolean);

  const entries = candidateIds.map((model_id) => {
    const capability = inferCapabilityFromModelId(model_id);
    return { model_id, capability };
  });

  let bestId = primaryCandidate;
  let bestScore = -1;
  const scored: string[] = [];
  for (const row of entries) {
    let score = scoreCapability(row.capability, policy.weights);
    if (worker && row.model_id === worker) score += 0.12;
    if (row.model_id === baseBridge) score += 0.04;
    scored.push(`${row.model_id}=${score.toFixed(3)}`);
    if (score > bestScore) {
      bestScore = score;
      bestId = row.model_id;
    }
  }

  let maxTokens: number | undefined;
  let temperature: number | undefined;
  switch (settings.aiOperatorMode) {
    case 'fast':
      maxTokens = Math.min(args.workerModelId ? 2048 : 1536, 4096);
      temperature = 0.22;
      break;
    case 'deep_reasoning':
      maxTokens = Math.min(4096, 8192);
      temperature = 0.42;
      break;
    case 'private_local':
      maxTokens = 1200;
      temperature = 0.28;
      break;
    case 'best_evidence':
      maxTokens = 4096;
      temperature = 0.35;
      break;
    default:
      maxTokens = 3072;
      temperature = 0.35;
  }

  const modeHints: Record<AiOperatorMode, string> = {
    fast: 'Keep answers concise; skip long preambles unless asked.',
    balanced: 'Balance depth and speed; prefer practical next actions.',
    deep_reasoning:
      'Use careful multi-step reasoning; surface assumptions and verification steps briefly.',
    private_local:
      'Prefer concise, workspace-grounded answers; avoid speculative claims without evidence.',
    best_evidence:
      'Prefer citation-backed statements; emit brandOpsAiProvenance when evidence exists.'
  };

  let behaviorHint = modeHints[settings.aiOperatorMode];
  if (
    settings.aiOperatorMode === 'private_local' &&
    settings.aiAdapterMode !== 'local-only' &&
    !settings.localModelEnabled
  ) {
    behaviorHint +=
      ' (Hosted bridge active — full device-local inference still requires local adapter setup.)';
  }

  const diagnosticsParts = [
    `policy=${policy.policy_id}`,
    `selected=${bestId}`,
    `mode=${settings.aiOperatorMode}`,
    `candidates=${scored.join(', ')}`
  ];

  return {
    schema_version: ROUTING_SCHEMA_VERSION,
    modelId: bestId,
    maxTokens,
    temperature,
    taskType: policy.primary_task,
    policy,
    behaviorHint: clip(behaviorHint, 520),
    diagnosticsDetail: settings.aiRoutingDiagnosticsEnabled
      ? clip(diagnosticsParts.join(' · '), 1600)
      : undefined
  };
}
