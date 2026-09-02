/**
 * Professional Signal Engine — continuously derives non-sensitive, evidence-backed
 * professional signals from verified activity. When confidence and relevance cross
 * configurable thresholds, creates TwinUpdateProposal and asks user to accept/edit/reject.
 */

import type {
  ActivityEvent,
  ProfessionalSignal,
  ProfessionalSignalKind,
  TwinDeltaField,
  TwinUpdateProposal,
  TwinDelta,
  TwinDeltaEvidence
} from '../../types/builder';

/** Configuration thresholds for signal derivation. */
export interface SignalEngineConfig {
  /** Minimum confidence for a signal to be considered. */
  minConfidence: number;
  /** Minimum confidence for a signal to trigger a TwinUpdateProposal. */
  proposalThreshold: number;
  /** Minimum occurrences before a "frequently" signal fires. */
  frequencyThreshold: number;
  /** Time window for frequency counting (ms). */
  frequencyWindowMs: number;
  /** Fields that signals can propose updates for. */
  editableFields: TwinDeltaField[];
}

/** Default configuration for signal derivation. */
export const DEFAULT_SIGNAL_ENGINE_CONFIG: SignalEngineConfig = {
  minConfidence: 0.5,
  proposalThreshold: 0.7,
  frequencyThreshold: 3,
  frequencyWindowMs: 90 * 24 * 60 * 60 * 1000, // 90 days
  editableFields: [
    'identity/headline',
    'identity/summary',
    'identity/professionalPositioning',
    'identity/targetAudience',
    'resume/skills',
    'resume/achievements'
  ]
};

/** A rule that derives a signal from an activity event. */
interface SignalRule {
  kind: ProfessionalSignalKind;
  /** Which activity kinds trigger this signal. */
  fromKinds: ActivityEvent['kind'][];
  /** Build the signal claim. */
  claim: (event: ActivityEvent, context: SignalContext) => string;
  /** Base confidence from the event. */
  confidence: (event: ActivityEvent) => number;
  /** Which Twin field this signal may update. */
  proposedField?: TwinDeltaField;
  /** Whether this is a frequency-based signal. */
  frequencyBased?: boolean;
}

/** Context available when deriving signals. */
interface SignalContext {
  recentVerifiedAchievements: ActivityEvent[];
  recentActivityCount: number;
  timeWindowDays: number;
}

/** Signal derivation rules. */
const SIGNAL_RULES: SignalRule[] = [
  {
    kind: 'frequently-builds-ai-agent-infrastructure',
    fromKinds: ['feature-built', 'integration-completed'],
    claim: (event, _ctx) => {
      if (
        event.detail.toLowerCase().includes('agent') ||
        event.detail.toLowerCase().includes('ai')
      ) {
        return 'frequently builds AI agent infrastructure';
      }
      return 'frequently builds software features';
    },
    confidence: (event) => {
      const base = event.verificationStatus === 'USER_VERIFIED' ? 0.8 : 0.5;
      return Math.min(1, base + (event.evidence?.length ? 0.1 : 0));
    },
    proposedField: 'identity/professionalPositioning',
    frequencyBased: true
  },
  {
    kind: 'publishes-technical-content',
    fromKinds: ['documentation-published'],
    claim: () => 'publishes technical educational content',
    confidence: (event) => event.confidence * 0.85,
    proposedField: 'identity/professionalPositioning'
  },
  {
    kind: 'currently-prioritizing-developer-tooling',
    fromKinds: ['feature-built', 'significant-refactor', 'integration-completed'],
    claim: (event) => {
      const detail = event.detail.toLowerCase();
      if (detail.includes('tool') || detail.includes('cli') || detail.includes('sdk')) {
        return 'currently prioritizing developer tooling';
      }
      return 'currently building software features';
    },
    confidence: (event) => {
      const base = event.verificationStatus === 'USER_VERIFIED' ? 0.75 : 0.5;
      return Math.min(1, base + (event.evidence?.length ? 0.05 : 0));
    },
    proposedField: 'identity/professionalPositioning'
  },
  {
    kind: 'ships-products',
    fromKinds: ['product-launched', 'repository-released'],
    claim: () => 'ships products and releases',
    confidence: (event) => event.confidence * 0.9,
    proposedField: 'resume/achievements'
  },
  {
    kind: 'improves-performance',
    fromKinds: ['benchmark-improved'],
    claim: () => 'improves performance and benchmarks',
    confidence: (event) => event.confidence * 0.85,
    proposedField: 'resume/skills'
  },
  {
    kind: 'contributes-to-open-source',
    fromKinds: ['open-source-contribution'],
    claim: () => 'contributes to open source',
    confidence: (event) => event.confidence * 0.9,
    proposedField: 'resume/achievements'
  },
  {
    kind: 'delivers-milestones',
    fromKinds: ['project-milestone'],
    claim: () => 'consistently delivers project milestones',
    confidence: (event) => event.confidence * 0.8,
    proposedField: 'identity/summary'
  },
  {
    kind: 'writes-documentation',
    fromKinds: ['documentation-published'],
    claim: () => 'writes technical documentation',
    confidence: (event) => event.confidence * 0.85,
    proposedField: 'resume/skills'
  }
];

/**
 * Derive professional signals from verified activity.
 */
export interface DeriveSignalsInput {
  /** Direct event list (preferred). */
  events?: ActivityEvent[];
  /** Workspace wrapper — used when called from builderToolHandlers. */
  state?: {
    workspaceId: string;
    events: ActivityEvent[];
    achievements: DerivedSignal[];
    projects: Array<{ id: string; workspaceId: string }>;
    signals: DerivedSignal[];
  };
  config?: Partial<SignalEngineConfig>;
  workspaceId?: string;
}

export interface DerivedSignal {
  signal: ProfessionalSignal;
  triggerEvent: ActivityEvent;
  confidence: number;
  proposedUpdates?: TwinUpdateProposal[];
}

export function deriveSignals(input: DeriveSignalsInput): DerivedSignal[] {
  const config = { ...DEFAULT_SIGNAL_ENGINE_CONFIG, ...input.config };
  const events = input.events ?? input.state?.events ?? [];
  const eventsFiltered = events.filter(
    (e) =>
      e.verificationStatus === 'USER_VERIFIED' || e.verificationStatus === 'INDEPENDENTLY_SUPPORTED'
  );

  if (eventsFiltered.length === 0) return [];

  const context: SignalContext = {
    recentVerifiedAchievements: eventsFiltered,
    recentActivityCount: eventsFiltered.length,
    timeWindowDays: 90
  };

  const derived: DerivedSignal[] = [];

  for (const event of eventsFiltered) {
    for (const rule of SIGNAL_RULES) {
      if (!rule.fromKinds.includes(event.kind)) continue;

      const confidence = rule.confidence(event);
      if (confidence < config.minConfidence) continue;

      const claim = rule.claim(event, context);

      // Check if we already have this signal
      const existingSignal = derived.find(
        (d) => d.signal.kind === rule.kind && d.signal.claim === claim
      );

      if (existingSignal) {
        // Bump confidence and update timestamps
        existingSignal.signal.lastObservedAt = event.timestamp;
        existingSignal.signal.confidence = Math.max(existingSignal.signal.confidence, confidence);
        existingSignal.triggerEvent = event;
        continue;
      }

      // Check frequency-based rules
      if (rule.frequencyBased) {
        const recentEvents = events.filter(
          (e) =>
            e.timestamp && new Date(e.timestamp).getTime() > Date.now() - config.frequencyWindowMs
        );
        if (recentEvents.length < config.frequencyThreshold) continue;
      }

      const signal: ProfessionalSignal = {
        id: `signal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        workspaceId: event.workspaceId,
        claim,
        kind: rule.kind,
        evidenceIds: [event.id],
        confidence,
        firstObservedAt: event.timestamp,
        lastObservedAt: event.timestamp,
        status: 'proposed',
        userVerified: false,
        reason: `Signal "${claim}" derived from ${event.kind} activity.`,
        updatedAt: new Date().toISOString()
      };

      derived.push({
        signal,
        triggerEvent: event,
        confidence
      });
    }
  }

  return derived;
}

/**
 * Create TwinUpdateProposal from signals that cross the proposal threshold.
 */
export interface SignalsToProposalsInput {
  signals: DerivedSignal[];
  existingTwinState: {
    headline?: string;
    summary?: string;
    professionalPositioning?: string;
    targetAudience?: string;
    skills?: string[];
    achievements?: string[];
  };
  config?: Partial<SignalEngineConfig>;
}

export function signalsToTwinUpdateProposals(input: SignalsToProposalsInput): DerivedSignal[] {
  const config = { ...DEFAULT_SIGNAL_ENGINE_CONFIG, ...input.config };
  const derived: DerivedSignal[] = [];

  for (const signal of input.signals) {
    if (signal.confidence < config.proposalThreshold) continue;
    if (!signal.signal.kind.endsWith('proposedField')) continue;

    const editableField = SIGNAL_RULES.find((r) => r.kind === signal.signal.kind)?.proposedField as
      | TwinDeltaField
      | undefined;
    if (!editableField) continue;

    const existingValue = getNestedValue(input.existingTwinState, editableField);
    const proposedValue = deriveProposedValue(signal.signal, existingValue);

    if (existingValue === proposedValue) continue;

    const delta: TwinDelta = {
      id: `delta-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      workspaceId: signal.signal.workspaceId,
      field: editableField,
      previousValue: existingValue,
      proposedValue,
      evidence: signal.signal.evidenceIds.map((id) => ({
        type: 'activity-event',
        id
      })) as TwinDeltaEvidence[],
      reason: `Signal "${signal.signal.claim}" suggests updating ${editableField}. Confidence: ${signal.confidence.toFixed(2)}.`,
      confidence: signal.confidence,
      proposedBy: 'professional-signal-engine',
      createdAt: new Date().toISOString(),
      status: 'proposed'
    };

    const proposal: TwinUpdateProposal = {
      id: `proposal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      workspaceId: signal.signal.workspaceId,
      deltas: [delta],
      summary: `Professional signal: ${signal.signal.claim}`,
      evidence: [] as TwinDeltaEvidence[],
      confidence: signal.confidence,
      reason: `Derived from ${signal.triggerEvent.kind} activity. Proposed by signal engine.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'professional-signal-engine'
    };

    derived.push({
      signal: signal.signal,
      triggerEvent: signal.triggerEvent,
      confidence: signal.confidence,
      proposedUpdates: [proposal]
    });
  }

  return derived;
}

/** Get nested value from twin state by field path. */
function getNestedValue(state: Record<string, unknown>, field: string): string {
  const parts = field.split('/');
  let value: unknown = state;

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return '';
    }
  }

  return typeof value === 'string' ? value : '';
}

/** Derive proposed value for a Twin field from a signal. */
function deriveProposedValue(signal: ProfessionalSignal, existingValue: string): string {
  switch (signal.kind) {
    case 'frequently-builds-ai-agent-infrastructure':
      return existingValue
        ? `${existingValue}; frequently builds AI agent infrastructure`
        : 'frequently builds AI agent infrastructure';
    case 'publishes-technical-content':
      return existingValue
        ? `${existingValue}; publishes technical educational content`
        : 'publishes technical educational content';
    case 'currently-prioritizing-developer-tooling':
      return existingValue
        ? `${existingValue}; currently prioritizing developer tooling`
        : 'currently prioritizing developer tooling';
    case 'ships-products':
      return existingValue
        ? `${existingValue}; ships products and releases`
        : 'ships products and releases';
    case 'improves-performance':
      return existingValue
        ? `${existingValue}; improves performance and benchmarks`
        : 'improves performance and benchmarks';
    case 'contributes-to-open-source':
      return existingValue
        ? `${existingValue}; contributes to open source`
        : 'contributes to open source';
    case 'delivers-milestones':
      return existingValue
        ? `${existingValue}; consistently delivers project milestones`
        : 'consistently delivers project milestones';
    case 'writes-documentation':
      return existingValue
        ? `${existingValue}; writes technical documentation`
        : 'writes technical documentation';
    default:
      return existingValue || signal.claim;
  }
}
