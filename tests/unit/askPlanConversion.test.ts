import { describe, expect, it } from 'vitest';
import {
  convertAskResponseToPlan,
  savePlanDraftToWorkspace,
  validatePlanDraft
} from '../../src/services/plan/askPlanConversion';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { cloneSeedData } from '../helpers/fixtures';

describe('Ask response to PLAN conversion', () => {
  it('returns a structured draft with source context and approval gates', () => {
    const workspace = cloneSeedData();
    const result = convertAskResponseToPlan({
      conversationId: 'conversation-1',
      messageId: 'assistant-1',
      responseText:
        'Build an outreach motion for AI operations leaders on LinkedIn. Use proof from reviewed case studies and follow up next week.',
      userIntent: 'How should I turn this positioning idea into outreach?',
      activeTwinId: null,
      planPreset: 'outreach-plan',
      workspaceContext: workspace,
      verifiedFactsUsed: ['Reviewed case study: AI workflow launch'],
      unverifiedMissingFacts: ['Named recipients']
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draft.status).toBe('draft');
    expect(result.draft.planType).toBe('outreach-plan');
    expect(result.draft.source.conversationId).toBe('conversation-1');
    expect(result.draft.source.sourceSurface).toBe('ask-my-twin');
    expect(result.draft.steps.length).toBeGreaterThanOrEqual(4);
    expect(result.draft.steps.some((step) => step.approvalRequired)).toBe(true);
    expect(result.draft.requiredApprovals.join(' ')).toContain('before sending');
    expect(validatePlanDraft(result.draft).ok).toBe(true);
  });

  it('saves only after confirmation and creates a plan receipt', () => {
    const workspace = cloneSeedData();
    const draftResult = convertAskResponseToPlan({
      conversationId: 'conversation-2',
      messageId: 'assistant-2',
      responseText: 'Analyze this new market opportunity and propose next experiments.',
      userIntent: 'Is this opportunity worth pursuing?',
      activeTwinId: null,
      planPreset: 'opportunity-analysis-plan',
      workspaceContext: workspace
    });
    expect(draftResult.ok).toBe(true);
    if (!draftResult.ok) return;
    expect(workspace.planWorkspace?.plans.length ?? 0).toBe(0);

    const saved = savePlanDraftToWorkspace({
      workspace,
      draft: draftResult.draft,
      userAction: 'save-plan'
    });
    const snapshot = buildWorkspaceSnapshot(saved.workspace);

    expect(saved.plan.status).toBe('opportunity');
    expect(saved.receipt.convertedFrom).toBe('Ask');
    expect(saved.workspace.planWorkspace?.plans[0]?.id).toBe(saved.plan.id);
    expect(snapshot.convertedAskPlans[0]?.sourceResponseId).toBe('assistant-2');
    expect(
      snapshot.planExecutionReceipts.some(
        (receipt) => receipt.sourceLabel === 'Created from Ask My Twin'
      )
    ).toBe(true);
  });

  it('does not misdetect a platform from words that merely contain the letter x', () => {
    const workspace = cloneSeedData();
    const result = convertAskResponseToPlan({
      conversationId: 'conversation-3',
      messageId: 'assistant-3',
      responseText:
        'Your context shows deep expertise here. For example, explain the exact positioning next.',
      userIntent: 'How do I explain my expertise clearly?',
      activeTwinId: null,
      planPreset: 'positioning-plan',
      workspaceContext: workspace
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Regression: `platformFromText` used to substring-match the single-letter 'x'
    // (X/Twitter) keyword against "context"/"expertise"/"example", forcing steps
    // BLOCKED on a platform nobody mentioned.
    expect(result.draft.steps.some((step) => step.status === 'blocked')).toBe(false);
    expect(result.draft.assumptions.join(' ')).not.toContain('is not connected or supported');
  });

  it('still detects a real platform mention as a whole word', () => {
    const workspace = cloneSeedData();
    const result = convertAskResponseToPlan({
      conversationId: 'conversation-4',
      messageId: 'assistant-4',
      responseText: 'Post this update on X to reach your audience today.',
      userIntent: 'Should I share this on X?',
      activeTwinId: null,
      planPreset: 'content-plan',
      workspaceContext: workspace
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draft.assumptions.join(' ')).toContain('Platform context detected: x');
  });

  it('rejects malformed inputs instead of saving raw prose', () => {
    const result = convertAskResponseToPlan({
      conversationId: '',
      messageId: '',
      responseText: '   ',
      userIntent: '',
      activeTwinId: null,
      planPreset: 'custom-plan',
      workspaceContext: cloneSeedData()
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toContain('conversationId is required.');
    expect(result.issues).toContain('messageId is required.');
    expect(result.issues).toContain('responseText is required.');
  });
});
