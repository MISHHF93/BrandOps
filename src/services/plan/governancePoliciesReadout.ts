import { getIntelligenceRules } from '../../rules/intelligenceRulesRuntime';
import type { GovernancePolicy } from '../../types/brandOpsUnified';

/** Maps packaged intelligence rules to lightweight Plan governance rows (no duplicate rule engine). */
export function governancePoliciesFromPackagedRules(): GovernancePolicy[] {
  const r = getIntelligenceRules();
  return [
    {
      policy_id: 'intel_content_priority',
      label: 'Content priority scoring',
      schema_version: r.schemaVersion
    },
    {
      policy_id: 'intel_outreach_stale',
      label: `Outreach stale after ${r.outreachUrgency.staleAfterHours}h`,
      schema_version: r.schemaVersion
    },
    {
      policy_id: 'intel_publishing_urgent',
      label: `Publishing urgency inside ${r.publishing.urgentWithinHours}h`,
      schema_version: r.schemaVersion
    },
    {
      policy_id: 'intel_digest_priority',
      label: `Digest technical priority top ${r.digest.technicalContentPriorityTop}`,
      schema_version: r.schemaVersion
    }
  ];
}
