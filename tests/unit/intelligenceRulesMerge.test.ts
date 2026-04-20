import { describe, expect, it } from 'vitest';
import { INTELLIGENCE_RULES_DEFAULTS } from '../../src/rules/intelligenceRulesDefaults';
import { mergeIntelligenceRules } from '../../src/rules/mergeIntelligenceRules';

describe('mergeIntelligenceRules', () => {
  it('returns defaults when remote is missing', () => {
    const merged = mergeIntelligenceRules(undefined);
    expect(merged.contentPriority.baseScore).toBe(INTELLIGENCE_RULES_DEFAULTS.contentPriority.baseScore);
  });

  it('merges known partial fields with clamps', () => {
    const merged = mergeIntelligenceRules({
      schemaVersion: 1,
      contentPriority: { readyBonus: 999 },
      publishing: { urgentWithinHours: 0.1 }
    });
    expect(merged.contentPriority.readyBonus).toBe(80);
    expect(merged.publishing.urgentWithinHours).toBe(0.25);
  });

  it('ignores incompatible schema major', () => {
    const merged = mergeIntelligenceRules({ schemaVersion: 99, contentPriority: { baseScore: 1 } });
    expect(merged.contentPriority.baseScore).toBe(INTELLIGENCE_RULES_DEFAULTS.contentPriority.baseScore);
  });

  it('merges nested heat and digest', () => {
    const merged = mergeIntelligenceRules({
      schemaVersion: 1,
      heat: { bandWarning: 65, followUp: { beyond: 30 } },
      digest: { technicalContentPriorityTop: 3 }
    });
    expect(merged.heat.bandWarning).toBe(65);
    expect(merged.heat.followUp.beyond).toBe(30);
    expect(merged.digest.technicalContentPriorityTop).toBe(3);
  });
});
