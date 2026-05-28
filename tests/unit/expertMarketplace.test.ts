import { describe, expect, it } from 'vitest';
import {
  MARKETPLACE_EXPERT_EXAMPLES,
  registerMarketplaceExperts,
  routeMarketplaceExperts,
  summarizeMarketplaceArchitecture,
  validateMarketplaceExpertManifest,
  type MarketplaceExpertManifest
} from '../../src/services/ai/expertMarketplace';

describe('expertMarketplace', () => {
  it('defines future marketplace examples without requiring UI', () => {
    expect(MARKETPLACE_EXPERT_EXAMPLES.map((expert) => expert.name)).toEqual([
      'Sales Expert',
      'Legal Expert',
      'Creator Monetization Expert',
      'Recruiting Expert'
    ]);

    for (const expert of MARKETPLACE_EXPERT_EXAMPLES) {
      expect(expert.professions.length).toBeGreaterThan(0);
      expect(expert.workflows.length).toBeGreaterThan(0);
      expect(expert.logic.approvalRequired).toBe(true);
      expect(expert.observability.emitsUserReceipt).toBe(true);
      expect(expert.observability.developerTraceInternalOnly).toBe(true);
    }
  });

  it('validates and registers marketplace manifests', () => {
    const result = registerMarketplaceExperts(MARKETPLACE_EXPERT_EXAMPLES);

    expect(result.accepted).toHaveLength(4);
    expect(result.rejected).toHaveLength(0);
    expect(result.issues.filter((issue) => issue.severity === 'error')).toHaveLength(0);
  });

  it('rejects unsafe manifests that bypass approval or trace boundaries', () => {
    const unsafe: MarketplaceExpertManifest = {
      ...MARKETPLACE_EXPERT_EXAMPLES[0],
      id: 'marketplace:bad/unsafe-sales-expert',
      logic: {
        ...MARKETPLACE_EXPERT_EXAMPLES[0].logic,
        approvalRequired: false
      },
      observability: {
        ...MARKETPLACE_EXPERT_EXAMPLES[0].observability,
        developerTraceInternalOnly: false
      }
    };

    const issues = validateMarketplaceExpertManifest(unsafe);

    expect(issues.some((issue) => issue.message.includes('require approval'))).toBe(true);
    expect(issues.some((issue) => issue.message.includes('developer traces internal'))).toBe(true);
  });

  it('routes profession and workflow specialized marketplace experts', () => {
    const [creator] = routeMarketplaceExperts(MARKETPLACE_EXPERT_EXAMPLES, {
      text: 'Build a sponsor offer and monetization workflow for my creator audience',
      mode: 'plan',
      professionPath: 'creator',
      workflowType: 'custom:creator_monetization',
      taskHints: ['opportunity_scoring', 'custom:offer_design'],
      availableContext: ['content_library', 'publishing_queue', 'operator_traces'],
      connectedIntegrations: ['linkedin'],
      maxExperts: 1
    });

    expect(creator?.manifest.name).toBe('Creator Monetization Expert');
    expect(creator?.missingContext).toHaveLength(0);
    expect(creator?.reasons).toContain('profession:creator');
    expect(creator?.reasons).toContain('workflow:custom:creator_monetization');

    const [recruiting] = routeMarketplaceExperts(MARKETPLACE_EXPERT_EXAMPLES, {
      text: 'Sequence candidate sourcing outreach and ATS follow-up',
      mode: 'operate',
      professionPath: 'recruiter',
      workflowType: 'recruiter_ops',
      taskHints: ['outreach_drafting', 'integration_mapping'],
      availableContext: ['contacts', 'integration_hub'],
      connectedIntegrations: ['ats'],
      maxExperts: 1
    });

    expect(recruiting?.manifest.name).toBe('Recruiting Expert');
  });

  it('summarizes extensibility surfaces for architecture docs', () => {
    const summary = summarizeMarketplaceArchitecture();

    expect(summary).toHaveLength(4);
    expect(summary.join('\n')).toContain('runtime=');
    expect(summary.join('\n')).toContain('integrations=');
  });
});
