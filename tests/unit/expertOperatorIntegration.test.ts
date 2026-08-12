import { describe, expect, it } from 'vitest';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import {
  buildExpertOperatorAskSystemBlock,
  buildExpertOperatorIntegrationReadout
} from '../../src/services/ai/expertOperatorIntegration';
import { buildHostedAskMessages } from '../../src/services/ai/hostedAskTurn';
import { buildOperationalPlanCards } from '../../src/pages/mobile/PlanOperationalStudio';
import { cloneSeedData } from '../helpers/fixtures';

describe('expertOperatorIntegration', () => {
  it('builds ASK, PLAN, and OPERATE mode readouts from one expert system', () => {
    const ws = cloneSeedData();
    ws.brand.positioning = 'Founder building operator workflows';
    const readout = buildExpertOperatorIntegrationReadout(ws, 'How should I operate this week?');

    expect(readout.ask.headline).toContain('ASK');
    expect(readout.plan.headline).toContain('PLAN');
    expect(readout.operate.headline).toContain('OPERATE');
    expect(readout.generatedUsing.length).toBeGreaterThan(0);
    expect(readout.headline).toContain('MoE operator active');
  });

  it('adds expert routing context to hosted ASK messages', () => {
    const ws = cloneSeedData();
    ws.brand.positioning = 'Creator educator building audience workflows';
    const messages = buildHostedAskMessages(ws, 'What should I focus on next?', null);

    expect(messages[0].content).toContain('BrandOps Mixture of Operational Experts');
    expect(messages[0].content).toContain('Profession path: creator');
    expect(messages[0].content).toContain('Generated using: Content Expert');
  });

  it('surfaces expert operator readout on PLAN/OPERATE snapshot and cards', () => {
    const ws = cloneSeedData();
    ws.brand.positioning = 'Recruiter improving candidate workflows';
    const snapshot = buildWorkspaceSnapshot(ws);
    const cards = buildOperationalPlanCards(snapshot);

    expect(snapshot.expertOperator.professionPath).toBe('recruiter');
    expect(snapshot.expertOperator.plan.expertNames).toEqual([
      'Outreach Expert',
      'Planning Expert',
      'Integration Expert'
    ]);
    expect(cards[0].previewCommand).toContain('Planning context: recruiter');
    expect(cards.some((card) => card.promise.includes('PLAN'))).toBe(true);
  });

  it('keeps the ASK system block operational and approval gated', () => {
    const ws = cloneSeedData();
    const block = buildExpertOperatorAskSystemBlock(ws, 'Operate this workflow');

    expect(block).toContain('ASK:');
    expect(block).toContain('PLAN:');
    expect(block).toContain('OPERATE:');
    expect(block).toContain('approval-gated');
    expect(block).not.toMatch(/chain-of-thought/i);
  });

  it('exposes sanitized expert execution receipts without developer traces', () => {
    const ws = cloneSeedData();
    ws.operatorTraces = {
      entries: [
        {
          id: 'approved-1',
          at: '2026-01-01T00:00:00.000Z',
          source: 'assistant',
          verb: 'execute',
          reviewStatus: 'approved'
        },
        {
          id: 'rejected-1',
          at: '2026-01-02T00:00:00.000Z',
          source: 'assistant',
          verb: 'execute',
          reviewStatus: 'rejected',
          annotatorNote: 'Needs human edit'
        }
      ]
    };

    const snapshot = buildWorkspaceSnapshot(ws);
    const expertReceipt = snapshot.expertOperator.operate.receipt;
    const planReceipt = snapshot.planExecutionReceipts.find(
      (receipt) => receipt.sourceLabel === 'Expert operator'
    );

    expect(snapshot.expertOperator.receipts).toHaveLength(3);
    expect(expertReceipt.activatedExperts.length).toBeGreaterThan(0);
    expect(expertReceipt.confidenceLabel).toContain('routing confidence');
    expect(expertReceipt.qualityLabel).toContain('output');
    expect(expertReceipt.latencyLabel).toContain('expert execution');
    expect(expertReceipt.approvalStatus).toContain('rejected');
    expect(JSON.stringify(expertReceipt)).not.toMatch(
      /developerOnly|observedSignals|routingReasons/i
    );
    expect(planReceipt?.reasoningSummary).toContain('Expert');
    expect(planReceipt?.sourceFactsUsed.join(' ')).toContain('routing confidence');
  });
});
