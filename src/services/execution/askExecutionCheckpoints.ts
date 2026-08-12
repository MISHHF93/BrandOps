import type {
  Checkpoint,
  CheckpointArtifactRef,
  CheckpointErrorState
} from '../../types/executionState';
import type { OperationalExpertId } from '../ai/expertRegistry';
import { buildCheckpoint, defaultFailureRecoveryActions } from './checkpointStore';

/**
 * Root checkpoint of an Ask turn — created the moment the user's question is
 * accepted. `sourceMessageId` links back to the full, untruncated question in
 * `ChatMessage[]` — `summary` is display-clamped (see `MAX_SUMMARY_LEN`), so
 * Retry must recover the original text via the message, not this field.
 */
export function beginAskCheckpoint(args: {
  conversationId: string;
  questionText: string;
  sourceMessageId?: string;
}): Checkpoint {
  return buildCheckpoint({
    conversationId: args.conversationId,
    type: 'ask.question',
    state: 'UNDERSTANDING',
    summary: args.questionText || 'Ask My Twin question',
    source: 'user',
    ...(args.sourceMessageId ? { sourceMessageId: args.sourceMessageId } : {})
  });
}

/**
 * Discloses the experts already-synchronously consulted for this turn (see
 * `expertOperatorIntegration.ts` — routing completes before the hosted call
 * starts). Represents an already-finished fact, not an in-progress step.
 *
 * `toolRef.expertId` only fits a single id — set it when exactly one expert
 * was consulted (the common case); leave it unset for zero or several rather
 * than picking one arbitrarily and misrepresenting the rest.
 */
export function expertConsultationCheckpoint(args: {
  conversationId: string;
  parentCheckpointId: string;
  expertNames: string[];
  expertIds?: OperationalExpertId[];
  associatedTwinId?: string;
}): Checkpoint {
  const soleExpertId = args.expertIds?.length === 1 ? args.expertIds[0] : undefined;
  return buildCheckpoint({
    conversationId: args.conversationId,
    parentCheckpointId: args.parentCheckpointId,
    type: 'tool.invocation',
    state: 'COMPLETED',
    summary: args.expertNames.length
      ? `Consulted: ${args.expertNames.join(', ')}`
      : 'No specialized experts consulted for this turn.',
    source: 'automation',
    ...(soleExpertId ? { toolRef: { expertId: soleExpertId } } : {}),
    ...(args.associatedTwinId ? { associatedTwinId: args.associatedTwinId } : {})
  });
}

export function completeAskCheckpoint(args: {
  conversationId: string;
  parentCheckpointId: string;
  responseSummary: string;
  generatedArtifactRef?: CheckpointArtifactRef;
  associatedTwinId?: string;
}): Checkpoint {
  return buildCheckpoint({
    conversationId: args.conversationId,
    parentCheckpointId: args.parentCheckpointId,
    type: 'ask.response',
    state: 'COMPLETED',
    summary: args.responseSummary,
    source: 'assistant',
    ...(args.generatedArtifactRef ? { generatedArtifactRef: args.generatedArtifactRef } : {}),
    ...(args.associatedTwinId ? { associatedTwinId: args.associatedTwinId } : {})
  });
}

/** One extra checkpoint when the turn actually minted a BrandOps AI Core artifact. */
export function artifactGeneratedCheckpoint(args: {
  conversationId: string;
  parentCheckpointId: string;
  artifactId: string;
  artifactTitle: string;
  associatedTwinId?: string;
}): Checkpoint {
  return buildCheckpoint({
    conversationId: args.conversationId,
    parentCheckpointId: args.parentCheckpointId,
    type: 'ask.artifact_generated',
    state: 'COMPLETED',
    summary: args.artifactTitle,
    source: 'assistant',
    generatedArtifactRef: { kind: 'ai_core_artifact', id: args.artifactId },
    ...(args.associatedTwinId ? { associatedTwinId: args.associatedTwinId } : {})
  });
}

export function failAskCheckpoint(args: {
  conversationId: string;
  parentCheckpointId: string;
  code: string;
  message: string;
  associatedTwinId?: string;
}): Checkpoint {
  const errorState: CheckpointErrorState = {
    code: args.code,
    message: args.message,
    recoveryActions: defaultFailureRecoveryActions(true)
  };
  return buildCheckpoint({
    conversationId: args.conversationId,
    parentCheckpointId: args.parentCheckpointId,
    type: 'ask.response',
    state: 'FAILED',
    /** Short and fixed — `errorState.message` already carries the specific reason, and both `Checkpoint`/`FailureCheckpoint` always render it right below this line, so repeating it here would just say the same thing twice. */
    summary: 'Ask failed',
    source: 'assistant',
    errorState,
    ...(args.associatedTwinId ? { associatedTwinId: args.associatedTwinId } : {})
  });
}

/** Single-tick checkpoint for the deterministic (non-`ask:`) structured command router — no real multi-stage work happens there. */
export function commandCheckpoint(args: {
  conversationId: string;
  commandText: string;
  ok: boolean;
}): Checkpoint {
  return buildCheckpoint({
    conversationId: args.conversationId,
    type: 'tool.invocation',
    state: args.ok ? 'COMPLETED' : 'FAILED',
    summary: args.commandText,
    source: 'user',
    ...(args.ok
      ? {}
      : {
          errorState: {
            code: 'command_failed',
            message: 'Structured workspace command failed.',
            recoveryActions: defaultFailureRecoveryActions(false)
          }
        })
  });
}
