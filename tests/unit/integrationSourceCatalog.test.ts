import { describe, expect, it } from 'vitest';
import type { IntegrationSourceKind } from '../../src/types/domain';
import {
  ALL_INTEGRATION_SOURCE_KINDS,
  INTEGRATION_SOURCE_PRESETS,
  integrationPresetForKind,
  resolveIntegrationKindFromCommand
} from '../../src/shared/integrations/integrationSourceCatalog';

describe('integrationSourceCatalog', () => {
  it('covers every IntegrationSourceKind with presets', () => {
    const keys = Object.keys(INTEGRATION_SOURCE_PRESETS) as IntegrationSourceKind[];
    expect(keys.length).toBe(ALL_INTEGRATION_SOURCE_KINDS.length);
    for (const k of ALL_INTEGRATION_SOURCE_KINDS) {
      const preset = integrationPresetForKind(k);
      expect(preset.label.length).toBeGreaterThan(0);
      expect(preset.artifactTypes.length).toBeGreaterThan(0);
      expect(preset.defaultTags.length).toBeGreaterThan(0);
    }
  });

  it('resolves kinds from natural-language connect lines', () => {
    expect(resolveIntegrationKindFromCommand('connect hubspot source: CRM')).toBe('hubspot');
    expect(resolveIntegrationKindFromCommand('connect salesforce source: SF')).toBe('salesforce');
    expect(resolveIntegrationKindFromCommand('connect linear source: backlog')).toBe('linear');
    expect(resolveIntegrationKindFromCommand('connect zendesk source: help')).toBe('zendesk');
    expect(resolveIntegrationKindFromCommand('connect stripe source: billing')).toBe('stripe');
    expect(resolveIntegrationKindFromCommand('connect microsoft 365 source: tenant')).toBe(
      'microsoft-365'
    );
    expect(resolveIntegrationKindFromCommand('connect meta ads source: paid')).toBe('meta-business');
    expect(resolveIntegrationKindFromCommand('connect linkedin marketing source: ads')).toBe(
      'linkedin-marketing'
    );
    expect(resolveIntegrationKindFromCommand('connect notion source: wiki')).toBe('notion');
    expect(resolveIntegrationKindFromCommand('connect google workspace source: ops')).toBe(
      'google-workspace'
    );
    expect(resolveIntegrationKindFromCommand('connect mystery vendor source: x')).toBe('custom-api');
  });
});
