import { INTELLIGENCE_RULES_DEFAULTS } from './intelligenceRulesDefaults';
import type { IntelligenceRulesPack } from './intelligenceRulesTypes';
import { mergeIntelligenceRules } from './mergeIntelligenceRules';

let current: IntelligenceRulesPack = structuredClone(INTELLIGENCE_RULES_DEFAULTS);

/** How the in-memory rules pack was last resolved in {@link initIntelligenceRulesFromRemote}. */
export type IntelligenceRulesLoadMode = 'defaults' | 'env-url' | 'bundled-json';

export interface IntelligenceRulesLoadProvenance {
  loadedAt: string;
  mode: IntelligenceRulesLoadMode;
  /** Resolved fetch URL when mode is env-url or bundled-json. */
  detail?: string;
  /** Present when falling back to defaults after a failed fetch attempt. */
  error?: string;
}

const INITIAL_PROVENANCE: IntelligenceRulesLoadProvenance = {
  loadedAt: new Date(0).toISOString(),
  mode: 'defaults',
  detail: undefined,
  error: undefined
};

let loadProvenance: IntelligenceRulesLoadProvenance = { ...INITIAL_PROVENANCE };

export function getIntelligenceRules(): IntelligenceRulesPack {
  return current;
}

export function getIntelligenceRulesLoadProvenance(): IntelligenceRulesLoadProvenance {
  return { ...loadProvenance };
}

function bundledJsonFetchUrl(): string {
  if (typeof chrome !== 'undefined' && typeof chrome.runtime?.getURL === 'function') {
    return chrome.runtime.getURL('brandops-intelligence-rules.json');
  }
  return '/brandops-intelligence-rules.json';
}

/** For tests: reset to embedded defaults without remote patch. */
export function resetIntelligenceRulesForTests(): void {
  current = structuredClone(INTELLIGENCE_RULES_DEFAULTS);
  loadProvenance = { ...INITIAL_PROVENANCE };
}

/**
 * Resolve L1 defaults + optional L2 remote partial (same-origin file or `VITE_INTELLIGENCE_RULES_URL`).
 * Safe to call multiple times; last successful fetch wins.
 */
export async function initIntelligenceRulesFromRemote(): Promise<void> {
  const loadedAt = new Date().toISOString();
  let remote: unknown | undefined = undefined;
  let mode: IntelligenceRulesLoadMode = 'defaults';
  let detail: string | undefined;
  const errors: string[] = [];

  const envUrl = import.meta.env.VITE_INTELLIGENCE_RULES_URL?.trim();

  if (envUrl) {
    try {
      const response = await fetch(envUrl, { cache: 'no-store' });
      if (response.ok) {
        remote = await response.json();
        mode = 'env-url';
        detail = envUrl;
      } else {
        errors.push(`env URL HTTP ${response.status}`);
      }
    } catch (e) {
      errors.push(`env: ${e instanceof Error ? e.message : 'fetch failed'}`);
    }
  }

  if (remote === undefined) {
    const bundled = bundledJsonFetchUrl();
    try {
      const response = await fetch(bundled, { cache: 'no-store' });
      if (response.ok) {
        remote = await response.json();
        mode = 'bundled-json';
        detail = bundled;
      } else {
        errors.push(`bundled HTTP ${response.status}: ${bundled}`);
      }
    } catch (e) {
      errors.push(`bundled: ${e instanceof Error ? e.message : 'fetch failed'} (${bundled})`);
    }
  }

  current = mergeIntelligenceRules(remote);

  if (remote === undefined) {
    mode = 'defaults';
    detail = undefined;
  }

  loadProvenance = {
    loadedAt,
    mode,
    detail: mode !== 'defaults' ? detail : undefined,
    error: mode === 'defaults' && errors.length > 0 ? errors.join(' · ') : undefined
  };
}
