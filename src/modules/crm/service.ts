import { Opportunity, OpportunityStage } from '../../types/domain';

export function moveOpportunityStage(
  opportunity: Opportunity,
  nextStage: OpportunityStage
): Opportunity {
  return {
    ...opportunity,
    stage: nextStage,
    updatedAt: new Date().toISOString()
  };
}
