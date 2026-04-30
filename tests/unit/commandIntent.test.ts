import { describe, expect, it } from 'vitest';
import { parseCommandRoute } from '../../src/services/agent/intent/commandIntent';

describe('parseCommandRoute', () => {
  it('prefers specific routes before general ones', () => {
    expect(parseCommandRoute('update contact relationship: trusted')).toBe(
      'update-contact-relationship'
    );
    expect(parseCommandRoute('update contact: Jane, Acme, CTO')).toBe('update-contact');
  });

  it('maps integration and ssh routes', () => {
    expect(parseCommandRoute('add integration artifact: title: Sync')).toBe(
      'add-integration-artifact'
    );
    expect(parseCommandRoute('add artifact: Q4 plan')).toBe('add-integration-artifact');
    expect(parseCommandRoute('add ssh: name: s1 host: h.example.com port: 22 user: u')).toBe(
      'add-ssh-target'
    );
  });

  it('maps pipeline health and rank opportunities', () => {
    expect(parseCommandRoute('pipeline health')).toBe('pipeline-health');
    expect(parseCommandRoute('What is our opportunity health?')).toBe('pipeline-health');
    expect(parseCommandRoute('rank opportunities by priority')).toBe('pipeline-health');
  });

  it('maps BrandOps strategy functions without stealing operational commands', () => {
    expect(parseCommandRoute('audit_positioning')).toBe('brand-function');
    expect(parseCommandRoute('weekly market scan')).toBe('brand-function');
    expect(parseCommandRoute('draft outreach: follow up on warm lead')).toBe('add-outreach-draft');
    expect(parseCommandRoute('draft post: weekly insight')).toBe('add-publishing-draft');
  });

  it('maps archive / restore opportunity and content duplicate / archive', () => {
    expect(parseCommandRoute('archive opportunity')).toBe('archive-opportunity');
    expect(parseCommandRoute('restore opportunity')).toBe('restore-opportunity');
    expect(parseCommandRoute('duplicate content: Execution beats inspiration')).toBe(
      'duplicate-content'
    );
    expect(parseCommandRoute('archive content: Hook: workflow ambiguity')).toBe('archive-content');
  });
});
