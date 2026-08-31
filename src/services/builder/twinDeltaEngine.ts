/**
 * Twin Delta Engine — stops rebuilding the entire Digital Twin when new information
 * arrives. Calculates explicit deltas between existing verified Twin state and newly
 * verified information.
 *
 * Produces TwinDelta objects with field, previousValue, proposedValue, evidence,
 * reason, and confidence. Requires confirmation for material identity/positioning/
 * profession changes. Maintains Twin version history.
 */

import type { TwinDelta, TwinDeltaField, TwinUpdateProposal, TwinDeltaEvidence } from '../../types/builder';

/** Version snapshot for Twin version history (local type — engine's own richer shape). */
export interface TwinVersion {
  id: string;
  workspaceId: string;
  twinId: string;
  snapshot: {
    headline: string;
    summary: string;
    professionalPositioning: string;
    targetAudience: string;
    toneOfVoice: string;
    expertiseAreas: string[];
    skills: string[];
    achievements: string[];
    goals: string[];
  };
  previousSnapshot: {
    headline: string;
    summary: string;
    professionalPositioning: string;
    targetAudience: string;
    toneOfVoice: string;
    expertiseAreas: string[];
    skills: string[];
    achievements: string[];
    goals: string[];
  };
  changes: Array<{ field: string; from: string; to: string; status: string }>;
  appliedBy: string;
  appliedAt: string;
  appliedDeltas: string[];
  deltaCount: number;
  hasMaterialChanges: boolean;
}

export interface TwinVersionHistoryState {
  versions: TwinVersion[];
  currentVersion: number;
}
export interface CurrentTwinState {
  id: string;
  workspaceId: string;
  headline: string;
  summary: string;
  professionalPositioning: string;
  targetAudience: string;
  toneOfVoice: string;
  expertiseAreas: string[];
  skills: string[];
  achievements: string[];
  goals: string[];
  createdAt: string;
  updatedAt: string;
}

/** New verified information to diff against current state. */
export interface VerifiedInfoUpdate {
  headline?: string;
  summary?: string;
  professionalPositioning?: string;
  targetAudience?: string;
  toneOfVoice?: string;
  expertiseAreas?: string[];
  skills?: string[];
  achievements?: string[];
  goals?: string[];
}

/** Configuration for material-field gating. */
export interface TwinDeltaConfig {
  /** Fields that are considered material and require explicit confirmation. */
  materialFields: TwinDeltaField[];
  /** Minimum confidence for a delta to be proposed. */
  minConfidence: number;
  /** Max deltas per update batch. */
  maxDeltasPerBatch: number;
}

const DEFAULT_CONFIG: TwinDeltaConfig = {
  materialFields: [
    'identity/headline',
    'identity/professionalPositioning',
    'identity/toneOfVoice',
    'identity/targetAudience',
    'resume/skills',
    'resume/achievements'
  ],
  minConfidence: 0.6,
  maxDeltasPerBatch: 20
};

/**
 * Calculate deltas between current Twin state and new verified information.
 * Returns TwinDelta objects with full provenance.
 */
export interface CalculateDeltasInput {
  currentTwin: CurrentTwinState;
  newVerifiedInfo: VerifiedInfoUpdate;
  config?: Partial<TwinDeltaConfig>;
  source?: string;
  sourceId?: string;
}

export interface CalculateDeltasResult {
  deltas: TwinDelta[];
  hasMaterialChanges: boolean;
  changeSummary: string;
}

export function calculateDeltas(
  input: CalculateDeltasInput
): CalculateDeltasResult {
  const config = { ...DEFAULT_CONFIG, ...input.config };
  const deltas: TwinDelta[] = [];
  const changeNotes: string[] = [];

  function makeDelta(partial: Omit<TwinDelta, 'id' | 'workspaceId' | 'createdAt' | 'status' | 'proposedBy'> & { evidence?: TwinDeltaEvidence[] }): TwinDelta {
    return {
      id: `delta-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      workspaceId: input.currentTwin.workspaceId,
      createdAt: new Date().toISOString(),
      status: 'proposed',
      proposedBy: 'activity-graph',
      ...partial,
      evidence: partial.evidence ?? []
    };
  }

  // Headline
  if (input.newVerifiedInfo.headline !== undefined) {
    const newHeadline = input.newVerifiedInfo.headline.trim();
    if (newHeadline && newHeadline !== input.currentTwin.headline) {
      const isMaterial = config.materialFields.includes('identity/headline');
      deltas.push(makeDelta({
        field: 'identity/headline',
        previousValue: input.currentTwin.headline,
        proposedValue: newHeadline,
        evidence: [] as TwinDeltaEvidence[],
        reason: isMaterial
          ? `Material change to headline: "${input.currentTwin.headline}" → "${newHeadline}". Requires confirmation.`
          : `Headline updated: "${input.currentTwin.headline}" → "${newHeadline}".`,
        confidence: isMaterial ? 0.9 : 0.7,
        requiresConfirmation: isMaterial,
        source: input.source ?? 'manual',
        sourceId: input.sourceId
      }));
      changeNotes.push(`Headline: "${input.currentTwin.headline.slice(0, 50)}" → "${newHeadline.slice(0, 50)}"`);
    }
  }

  // Summary
  if (input.newVerifiedInfo.summary !== undefined) {
    const newSummary = input.newVerifiedInfo.summary.trim();
    if (newSummary && newSummary !== input.currentTwin.summary) {
      deltas.push(makeDelta({
        field: 'identity/summary',
        previousValue: input.currentTwin.summary,
        proposedValue: newSummary,
        evidence: [] as TwinDeltaEvidence[],
        reason: `Summary updated.`,
        confidence: 0.7,
        requiresConfirmation: false,
        source: input.source ?? 'manual',
        sourceId: input.sourceId
      }));
      changeNotes.push('Summary updated');
    }
  }

  // Professional positioning
  if (input.newVerifiedInfo.professionalPositioning !== undefined) {
    const newPositioning = input.newVerifiedInfo.professionalPositioning.trim();
    if (newPositioning && newPositioning !== input.currentTwin.professionalPositioning) {
      const isMaterial = config.materialFields.includes('identity/professionalPositioning');
      deltas.push(makeDelta({
        field: 'identity/professionalPositioning',
        previousValue: input.currentTwin.professionalPositioning,
        proposedValue: newPositioning,
        evidence: [] as TwinDeltaEvidence[],
        reason: isMaterial
          ? `Material change to professional positioning: "${input.currentTwin.professionalPositioning.slice(0, 60)}" → "${newPositioning.slice(0, 60)}". Requires confirmation.`
          : `Professional positioning updated.`,
        confidence: isMaterial ? 0.9 : 0.7,
        requiresConfirmation: isMaterial,
        source: input.source ?? 'manual',
        sourceId: input.sourceId
      }));
      changeNotes.push(`Positioning: "${input.currentTwin.professionalPositioning.slice(0, 50)}" → "${newPositioning.slice(0, 50)}"`);
    }
  }

  // Target audience
  if (input.newVerifiedInfo.targetAudience !== undefined) {
    const newAudience = input.newVerifiedInfo.targetAudience.trim();
    if (newAudience && newAudience !== input.currentTwin.targetAudience) {
      deltas.push(makeDelta({
        field: 'identity/targetAudience',
        previousValue: input.currentTwin.targetAudience,
        proposedValue: newAudience,
        evidence: [] as TwinDeltaEvidence[],
        reason: `Target audience updated.`,
        confidence: 0.7,
        requiresConfirmation: false,
        source: input.source ?? 'manual',
        sourceId: input.sourceId
      }));
      changeNotes.push('Target audience updated');
    }
  }

  // Tone of voice
  if (input.newVerifiedInfo.toneOfVoice !== undefined) {
    const newTone = input.newVerifiedInfo.toneOfVoice.trim();
    if (newTone && newTone !== input.currentTwin.toneOfVoice) {
      deltas.push(makeDelta({
        field: 'identity/toneOfVoice',
        previousValue: input.currentTwin.toneOfVoice,
        proposedValue: newTone,
        evidence: [] as TwinDeltaEvidence[],
        reason: `Tone of voice updated.`,
        confidence: 0.7,
        requiresConfirmation: config.materialFields.includes('identity/toneOfVoice'),
        source: input.source ?? 'manual',
        sourceId: input.sourceId
      }));
      changeNotes.push('Tone of voice updated');
    }
  }

  // Expertise areas (diff)
  if (input.newVerifiedInfo.expertiseAreas) {
    const newAreas = input.newVerifiedInfo.expertiseAreas
      .map((a) => a.trim().toLowerCase())
      .filter((a) => a.length > 0);
    const currentAreas = input.currentTwin.expertiseAreas
      .map((a) => a.trim().toLowerCase());

    const added = newAreas.filter((a) => !currentAreas.includes(a));
    const removed = currentAreas.filter((a) => !newAreas.includes(a));

    if (added.length > 0 || removed.length > 0) {
      const newList = [...input.currentTwin.expertiseAreas];
      for (const area of added) {
        const original = input.newVerifiedInfo.expertiseAreas.find((a) => a.trim().toLowerCase() === area);
        if (original && !newList.includes(original)) {
          newList.push(original);
        }
      }

      deltas.push(makeDelta({
        field: 'identity/expertiseAreas',
        previousValue: input.currentTwin.expertiseAreas.join(', '),
        proposedValue: newList.join(', '),
        evidence: [] as TwinDeltaEvidence[],
        reason: `Expertise areas updated: +${added.length} new, -${removed.length} removed.`,
        confidence: 0.65,
        requiresConfirmation: false,
        source: input.source ?? 'manual',
        sourceId: input.sourceId
      }));
      changeNotes.push(`Expertise areas: +${added.length}, -${removed.length}`);
    }
  }

  // Skills (diff)
  if (input.newVerifiedInfo.skills) {
    const newSkills = input.newVerifiedInfo.skills
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);
    const currentSkills = input.currentTwin.skills
      .map((s) => s.trim().toLowerCase());

    const added = newSkills.filter((s) => !currentSkills.includes(s));
    const removed = currentSkills.filter((s) => !newSkills.includes(s));

    if (added.length > 0 || removed.length > 0) {
      const newList = [...input.currentTwin.skills];
      for (const skill of added) {
        const original = input.newVerifiedInfo.skills.find((s) => s.trim().toLowerCase() === skill);
        if (original && !newList.includes(original)) {
          newList.push(original);
        }
      }

      deltas.push(makeDelta({
        field: 'resume/skills',
        previousValue: input.currentTwin.skills.join(', '),
        proposedValue: newList.join(', '),
        evidence: [] as TwinDeltaEvidence[],
        reason: `Skills updated: +${added.length} new, -${removed.length} removed.`,
        confidence: 0.7,
        requiresConfirmation: config.materialFields.includes('resume/skills'),
        source: input.source ?? 'manual',
        sourceId: input.sourceId
      }));
      changeNotes.push(`Skills: +${added.length}, -${removed.length}`);
    }
  }

  // Achievements (diff)
  if (input.newVerifiedInfo.achievements) {
    const newAchievements = input.newVerifiedInfo.achievements
      .map((a) => a.trim().toLowerCase())
      .filter((a) => a.length > 0);
    const currentAchievements = input.currentTwin.achievements
      .map((a) => a.trim().toLowerCase());

    const added = newAchievements.filter((a) => !currentAchievements.includes(a));
    const removed = currentAchievements.filter((a) => !newAchievements.includes(a));

    if (added.length > 0 || removed.length > 0) {
      const newList = [...input.currentTwin.achievements];
      for (const achievement of added) {
        const original = input.newVerifiedInfo.achievements.find((a) => a.trim().toLowerCase() === achievement);
        if (original && !newList.includes(original)) {
          newList.push(original);
        }
      }

      deltas.push(makeDelta({
        field: 'resume/achievements',
        previousValue: input.currentTwin.achievements.slice(0, 5).join('; '),
        proposedValue: newList.slice(0, 5).join('; '),
        evidence: [] as TwinDeltaEvidence[],
        reason: `Achievements updated: +${added.length} new, -${removed.length} removed.`,
        confidence: 0.75,
        requiresConfirmation: config.materialFields.includes('resume/achievements'),
        source: input.source ?? 'manual',
        sourceId: input.sourceId
      }));
      changeNotes.push(`Achievements: +${added.length}, -${removed.length}`);
    }
  }

  // Goals (diff)
  if (input.newVerifiedInfo.goals) {
    const newGoals = input.newVerifiedInfo.goals
      .map((g) => g.trim().toLowerCase())
      .filter((g) => g.length > 0);
    const currentGoals = input.currentTwin.goals
      .map((g) => g.trim().toLowerCase());

    const added = newGoals.filter((g) => !currentGoals.includes(g));
    const removed = currentGoals.filter((g) => !newGoals.includes(g));

    if (added.length > 0 || removed.length > 0) {
      const newList = [...input.currentTwin.goals];
      for (const goal of added) {
        const original = input.newVerifiedInfo.goals.find((g) => g.trim().toLowerCase() === goal);
        if (original && !newList.includes(original)) {
          newList.push(original);
        }
      }

      deltas.push(makeDelta({
        field: 'goals',
        previousValue: input.currentTwin.goals.slice(0, 5).join('; '),
        proposedValue: newList.slice(0, 5).join('; '),
        evidence: [] as TwinDeltaEvidence[],
        reason: `Goals updated: +${added.length} new, -${removed.length} removed.`,
        confidence: 0.65,
        requiresConfirmation: false,
        source: input.source ?? 'manual',
        sourceId: input.sourceId
      }));
      changeNotes.push(`Goals: +${added.length}, -${removed.length}`);
    }
  }

  // Trim deltas to max batch size
  const trimmedDeltas = deltas.slice(0, config.maxDeltasPerBatch);

  const hasMaterialChanges = trimmedDeltas.some((d) => d.requiresConfirmation);
  const changeSummary = changeNotes.length > 0
    ? changeNotes.join('; ')
    : 'No changes detected.';

  return {
    deltas: trimmedDeltas,
    hasMaterialChanges,
    changeSummary
  };
}

/**
 * Create a TwinUpdateProposal from deltas.
 */
export interface CreateProposalInput {
  deltas: TwinDelta[];
  reason?: string;
  source?: string;
  sourceId?: string;
}

export interface CreateProposalResult {
  proposal: TwinUpdateProposal;
}

export function createTwinUpdateProposal(
  input: CreateProposalInput
): CreateProposalResult {
  if (input.deltas.length === 0) {
    throw new Error('Cannot create proposal with no deltas.');
  }

  const requiresConfirmation = input.deltas.some((d) => d.requiresConfirmation);
  const maxConfidence = Math.max(...input.deltas.map((d) => d.confidence));

  const proposal: TwinUpdateProposal = {
    id: `proposal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    workspaceId: input.deltas[0].workspaceId,
    deltas: input.deltas,
    summary: input.deltas.map((d) => `${d.field}: "${d.previousValue.slice(0, 40)}" → "${d.proposedValue.slice(0, 40)}"`).join('; '),
    confidence: maxConfidence,
    reason: input.reason ?? `Proposed by Twin Delta Engine. ${input.deltas.length} field(s) to update.`,
    requiresConfirmation,
    evidence: [],
    source: input.source ?? 'twin-delta-engine',
    sourceId: input.sourceId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'twin-delta-engine'
  };

  return { proposal };
}

/**
 * Apply accepted deltas to Twin state and produce a new version snapshot.
 */
export interface ApplyDeltasInput {
  currentTwin: CurrentTwinState;
  deltas: TwinDelta[];
  acceptedDeltaIds: string[];
  rejectedDeltaIds: string[];
  editedDeltas: Map<string, Partial<TwinDelta>>;
}

export interface ApplyDeltasResult {
  updatedTwin: CurrentTwinState;
  appliedDeltas: TwinDelta[];
  rejectedDeltas: TwinDelta[];
  editedDeltas: TwinDelta[];
  version: TwinVersion;
  newTwinState: CurrentTwinState;
}

export function applyDeltas(
  input: ApplyDeltasInput
): ApplyDeltasResult {
  const appliedDeltas: TwinDelta[] = [];
  const rejectedDeltas: TwinDelta[] = [];
  const editedDeltas: TwinDelta[] = [];

  // Start from a copy of current state
  const updatedTwin: CurrentTwinState = { ...input.currentTwin };

  for (const delta of input.deltas) {
    if (input.rejectedDeltaIds.includes(delta.id)) {
      rejectedDeltas.push(delta);
      continue;
    }

    if (!input.acceptedDeltaIds.includes(delta.id)) {
      continue;
    }

    // Check if this delta was edited
    const edited = input.editedDeltas.get(delta.id);
    const finalValue = edited?.proposedValue ?? delta.proposedValue;

    // Apply to the appropriate field
    switch (delta.field) {
      case 'identity/headline':
        updatedTwin.headline = finalValue;
        break;
      case 'identity/summary':
        updatedTwin.summary = finalValue;
        break;
      case 'identity/professionalPositioning':
        updatedTwin.professionalPositioning = finalValue;
        break;
      case 'identity/targetAudience':
        updatedTwin.targetAudience = finalValue;
        break;
      case 'identity/toneOfVoice':
        updatedTwin.toneOfVoice = finalValue;
        break;
      case 'identity/expertiseAreas':
        updatedTwin.expertiseAreas = finalValue.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
        break;
      case 'resume/skills':
        updatedTwin.skills = finalValue.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
        break;
      case 'resume/achievements':
        updatedTwin.achievements = finalValue.split(';').map((s) => s.trim()).filter((s) => s.length > 0);
        break;
      case 'goals':
        updatedTwin.goals = finalValue.split(';').map((s) => s.trim()).filter((s) => s.length > 0);
        break;
      default:
        // Unknown field — skip
        continue;
    }

    const appliedDelta: TwinDelta = {
      ...delta,
      previousValue: delta.previousValue,
      proposedValue: finalValue,
      appliedAt: new Date().toISOString(),
      status: edited ? 'edited' : 'accepted'
    };

    if (edited) {
      editedDeltas.push(appliedDelta);
    } else {
      appliedDeltas.push(appliedDelta);
    }
  }

  // Update timestamps
  updatedTwin.updatedAt = new Date().toISOString();

  // Create version snapshot
  const version: TwinVersion = {
    id: `version-${Date.now()}`,
    workspaceId: updatedTwin.workspaceId,
    twinId: updatedTwin.id,
    snapshot: {
      headline: updatedTwin.headline,
      summary: updatedTwin.summary,
      professionalPositioning: updatedTwin.professionalPositioning,
      targetAudience: updatedTwin.targetAudience,
      toneOfVoice: updatedTwin.toneOfVoice,
      expertiseAreas: updatedTwin.expertiseAreas,
      skills: updatedTwin.skills,
      achievements: updatedTwin.achievements,
      goals: updatedTwin.goals
    },
    previousSnapshot: {
      headline: input.currentTwin.headline,
      summary: input.currentTwin.summary,
      professionalPositioning: input.currentTwin.professionalPositioning,
      targetAudience: input.currentTwin.targetAudience,
      toneOfVoice: input.currentTwin.toneOfVoice,
      expertiseAreas: input.currentTwin.expertiseAreas,
      skills: input.currentTwin.skills,
      achievements: input.currentTwin.achievements,
      goals: input.currentTwin.goals
    },
    changes: appliedDeltas.map((d) => ({
      field: d.field,
      from: d.previousValue,
      to: d.proposedValue,
      status: d.status
    })),
    appliedBy: 'twin-delta-engine',
    appliedAt: new Date().toISOString(),
    appliedDeltas: appliedDeltas.map((d) => d.id),
    deltaCount: appliedDeltas.length,
    hasMaterialChanges: appliedDeltas.some((d) => d.requiresConfirmation)
  };

  return {
    updatedTwin,
    appliedDeltas,
    rejectedDeltas,
    editedDeltas,
    version,
    newTwinState: updatedTwin
  };
}

export function createInitialVersionHistory(
  twinId: string,
  workspaceId: string,
  initialSnapshot: CurrentTwinState
): TwinVersionHistoryState {
  const initialVersion: TwinVersion = {
    id: `version-${Date.now()}`,
    workspaceId,
    twinId,
    snapshot: {
      headline: initialSnapshot.headline,
      summary: initialSnapshot.summary,
      professionalPositioning: initialSnapshot.professionalPositioning,
      targetAudience: initialSnapshot.targetAudience,
      toneOfVoice: initialSnapshot.toneOfVoice,
      expertiseAreas: initialSnapshot.expertiseAreas,
      skills: initialSnapshot.skills,
      achievements: initialSnapshot.achievements,
      goals: initialSnapshot.goals
    },
    previousSnapshot: {
      headline: '',
      summary: '',
      professionalPositioning: '',
      targetAudience: '',
      toneOfVoice: '',
      expertiseAreas: [],
      skills: [],
      achievements: [],
      goals: []
    },
    changes: [],
    appliedBy: 'initial',
    appliedAt: initialSnapshot.createdAt,
    appliedDeltas: [],
    deltaCount: 0,
    hasMaterialChanges: false
  };

  return {
    versions: [initialVersion],
    currentVersion: 1
  };
}

export function addVersionToHistory(
  history: TwinVersionHistoryState,
  newVersion: TwinVersion
): TwinVersionHistoryState {
  return {
    versions: [...history.versions, newVersion].slice(-100), // Keep last 100 versions
    currentVersion: history.currentVersion + 1
  };
}
