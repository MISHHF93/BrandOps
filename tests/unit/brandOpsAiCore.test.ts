import { describe, expect, it } from 'vitest';
import { cloneSeedData } from '../helpers/fixtures';
import {
  normalizeBrandOpsAICoreState,
  prependBrandOpsAICoreResult,
  runBrandOpsAI
} from '../../src/services/ai/brandOpsAiCore';
import { createDigitalTwinFromText } from '../../src/services/digitalTwin/digitalTwin';
import { parseCommandRoute } from '../../src/services/agent/intent/commandIntent';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';

describe('BrandOps AI Core', () => {
  it('creates unified artifacts and approval gates from one request pipeline', async () => {
    const workspace = cloneSeedData();
    const response = await runBrandOpsAI({
      workspace,
      request: {
        intent: 'Create an outreach plan from current workspace context',
        mode: 'plan',
        userInput: 'Create an outreach plan',
        requiredOutputs: ['outreach draft', 'workflow plan'],
        safetyLevel: 'external',
        approvalRequired: true
      }
    });

    expect(response.artifacts).toHaveLength(2);
    expect(response.requiredApprovals.length).toBeGreaterThan(0);
    expect(response.artifacts.every((artifact) => artifact.auditReceipt)).toBe(true);
    expect(response.artifacts[0].sourceFactsUsed.length).toBeGreaterThan(0);
  });

  it('preserves twin context grounding on generated artifacts', async () => {
    const workspace = cloneSeedData();
    const { twin } = createDigitalTwinFromText({
      workspace,
      sourceType: 'resume',
      rawText: [
        'Avery Operator',
        'Summary',
        'Built AI operations systems for founder-led teams.',
        'Skills',
        'AI operations, lifecycle marketing, workflow design, GTM'
      ].join('\n')
    });
    const groundedWorkspace = {
      ...workspace,
      digitalTwins: { activeTwinId: twin.id, twins: [twin] }
    };

    const response = await runBrandOpsAI({
      workspace: groundedWorkspace,
      request: {
        intent: 'Summarize my profile',
        mode: 'ask',
        twinId: twin.id,
        userInput: 'Summarize my profile',
        requiredOutputs: ['resume summary'],
        safetyLevel: 'review',
        approvalRequired: false
      }
    });

    expect(response.artifacts[0].twinId).toBe(twin.id);
    expect(response.artifacts[0].sourceFactsUsed.some((fact) => fact.includes('Avery'))).toBe(true);
  });

  it('keeps default ASK artifacts conversational instead of operational plans', async () => {
    const workspace = cloneSeedData();
    const response = await runBrandOpsAI({
      workspace,
      request: {
        intent: 'Think through my positioning',
        mode: 'ask',
        userInput: 'Think through my positioning',
        safetyLevel: 'review',
        approvalRequired: false
      },
      generatedText: 'Conversation output with strategic analysis.'
    });

    expect(response.artifacts[0].type).toBe('opportunity analysis');
    expect(response.artifacts[0].type).not.toBe('operational plan');
  });

  it('labels missing facts before outputs are used externally', async () => {
    const workspace = cloneSeedData();
    const sparse = {
      ...workspace,
      brand: {
        ...workspace.brand,
        positioning: '',
        primaryOffer: '',
        voiceGuide: ''
      },
      digitalTwins: { activeTwinId: null, twins: [] }
    };

    const response = await runBrandOpsAI({
      workspace: sparse,
      request: {
        intent: 'Write a public bio',
        mode: 'ask',
        userInput: 'Write a public bio with guaranteed results',
        requiredOutputs: ['bio'],
        safetyLevel: 'external',
        approvalRequired: false
      }
    });

    expect(response.warnings.some((warning) => warning.includes('No active digital twin'))).toBe(true);
    expect(response.warnings.some((warning) => warning.includes('External-facing'))).toBe(true);
    expect(response.requiredApprovals).toHaveLength(1);
  });

  it('supports AI Batch Run with completed artifacts and retry metadata', async () => {
    const workspace = cloneSeedData();
    const response = await runBrandOpsAI({
      workspace,
      request: {
        intent: 'Generate my launch kit',
        mode: 'batch',
        userInput: 'Generate my launch kit',
        safetyLevel: 'review',
        approvalRequired: true
      }
    });

    expect(response.batchRun?.completedArtifacts.length).toBe(response.artifacts.length);
    expect(response.artifacts.map((artifact) => artifact.type)).toContain('positioning statement');
    expect(response.batchRun?.steps.every((step) => step.status === 'completed')).toBe(true);
  });

  it('persists normalized artifacts for frontend PLAN rendering', async () => {
    const workspace = cloneSeedData();
    const response = await runBrandOpsAI({
      workspace,
      request: {
        intent: 'Turn ASK answer into PLAN artifact',
        mode: 'ask',
        userInput: 'Turn ASK answer into PLAN artifact',
        requiredOutputs: ['operational plan'],
        safetyLevel: 'review',
        approvalRequired: false
      },
      generatedText: 'A grounded answer that should be captured as one AI Core artifact.'
    });

    const next = prependBrandOpsAICoreResult(workspace, response);
    const normalized = normalizeBrandOpsAICoreState(next.aiCore);
    const snapshot = buildWorkspaceSnapshot(next);

    expect(normalized.artifacts).toHaveLength(1);
    expect(snapshot.recentAiCoreArtifacts[0].content).toContain('grounded answer');
    expect(snapshot.recentOperatingTimelineEvents[0].title).toContain('Operational plan');
    expect(snapshot.recentOperatingTimelineEvents[0].source).toBe('BrandOps AI Core');
  });

  it('captures generated text for all artifact types instead of disconnected surface copies', async () => {
    const workspace = cloneSeedData();
    const response = await runBrandOpsAI({
      workspace,
      request: {
        intent: 'Convert a content planning surface into AI Core',
        mode: 'plan',
        userInput: 'Convert content plan',
        requiredOutputs: ['content plan'],
        safetyLevel: 'review',
        approvalRequired: true
      },
      generatedText: 'PLAN conversion payload with preview, approval gate, retry path, and export summary.'
    });

    expect(response.artifacts[0].type).toBe('content plan');
    expect(response.artifacts[0].content).toContain('PLAN conversion payload');
    expect(response.requiredApprovals).toHaveLength(1);
  });

  it('feeds Workspace Intelligence Core from approved AI Core artifacts', async () => {
    const workspace = cloneSeedData();
    const response = await runBrandOpsAI({
      workspace,
      request: {
        intent: 'Approve a reusable workflow for future workspace DNA',
        mode: 'plan',
        userInput: 'Approve this reusable workflow',
        requiredOutputs: ['workflow plan'],
        safetyLevel: 'review',
        approvalRequired: false
      },
      generatedText: 'Approved workflow: turn founder ideas into reviewable content and outreach plans.'
    });

    const next = prependBrandOpsAICoreResult(workspace, response);
    const snapshot = buildWorkspaceSnapshot(next);

    expect(next.workspaceIntelligence?.dna.approvedOutputs[0]).toContain('workflow plan');
    expect(snapshot.workspaceIntelligence.decisionMemory[0].polarity).toBe('approved');
    expect(snapshot.workspaceIntelligence.scorecard.map((metric) => metric.id)).toEqual([
      'identity-completeness',
      'positioning-strength',
      'workflow-maturity',
      'operational-readiness'
    ]);
    expect(snapshot.workspaceIntelligence.operatingManual.length).toBeGreaterThan(0);
  });

  it('routes AI Core batch commands through the supported command map', () => {
    expect(parseCommandRoute('ai core batch: generate my profile kit')).toBe('ai-core-batch-run');
  });
});
