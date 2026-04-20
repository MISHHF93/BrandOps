import { INTELLIGENCE_RULES_DEFAULTS } from './intelligenceRulesDefaults';
import type { IntelligenceRulesPack } from './intelligenceRulesTypes';
import { mergeIntelligenceRules } from './mergeIntelligenceRules';

let current: IntelligenceRulesPack = structuredClone(INTELLIGENCE_RULES_DEFAULTS);

export function getIntelligenceRules(): IntelligenceRulesPack {
  return current;
}

/** For tests: reset to embedded defaults without remote patch. */
export function resetIntelligenceRulesForTests(): void {
  current = structuredClone(INTELLIGENCE_RULES_DEFAULTS);
}

/**
 * Resolve L1 defaults + optional L2 remote partial (same-origin file or `VITE_INTELLIGENCE_RULES_URL`).
 * Safe to call multiple times; last successful fetch wins.
 */
export async function initIntelligenceRulesFromRemote(): Promise<void> {
  let remote: unknown;

  const envUrl = import.meta.env.VITE_INTELLIGENCE_RULES_URL?.trim();
  try {
    if (envUrl) {
      const response = await fetch(envUrl, { cache: 'no-store' });
      if (response.ok) remote = await response.json();
    } else {
      const response = await fetch('/brandops-intelligence-rules.json', { cache: 'no-store' });
      if (response.ok) remote = await response.json();
    }
  } catch {
    remote = undefined;
  }

  current = mergeIntelligenceRules(remote);
}
