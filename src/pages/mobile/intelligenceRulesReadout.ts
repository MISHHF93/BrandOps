import {
  getIntelligenceRules,
  getIntelligenceRulesLoadProvenance
} from '../../rules/intelligenceRulesRuntime';
import type { IntelligenceRulesLoadProvenance } from '../../rules/intelligenceRulesRuntime';

export type MobileIntelligenceRulesReadout = IntelligenceRulesLoadProvenance & {
  initRan: boolean;
  schemaVersion: number;
  contentPriorityBaseScore: number;
  outreachStaleAfterHours: number;
  publishingUrgentWithinHours: number;
  digestTechnicalContentPriorityTop: number;
  previewQueueSlice: number;
};

export function buildIntelligenceRulesReadout(): MobileIntelligenceRulesReadout {
  const prov = getIntelligenceRulesLoadProvenance();
  const r = getIntelligenceRules();
  const initRan = new Date(prov.loadedAt).getTime() !== 0;
  return {
    ...prov,
    initRan,
    schemaVersion: r.schemaVersion,
    contentPriorityBaseScore: r.contentPriority.baseScore,
    outreachStaleAfterHours: r.outreachUrgency.staleAfterHours,
    publishingUrgentWithinHours: r.publishing.urgentWithinHours,
    digestTechnicalContentPriorityTop: r.digest.technicalContentPriorityTop,
    previewQueueSlice: r.publishing.previewQueueSlice
  };
}
