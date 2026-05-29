export type WorkspaceDecisionPolarity = 'approved' | 'rejected';

export type WorkspaceOpportunityImpact = 'high' | 'medium' | 'low';

export interface WorkspaceDNA {
  profession: string;
  goals: string[];
  audience: string[];
  positioning: string[];
  workflows: string[];
  preferredTone: string[];
  strengths: string[];
  recurringActivities: string[];
  connectedPlatforms: string[];
  approvedOutputs: string[];
}

export interface WorkspaceDecisionMemoryEntry {
  id: string;
  polarity: WorkspaceDecisionPolarity;
  title: string;
  source: string;
  reason: string;
  confidence: number;
  createdAt: string;
}

export interface WorkspaceOpportunitySignal {
  id: string;
  title: string;
  detail: string;
  expectedImpact: WorkspaceOpportunityImpact;
  confidence: number;
  evidence: string[];
  suggestedAction: string;
  createdAt: string;
}

export interface WorkspaceScorecardMetric {
  id: 'identity-completeness' | 'positioning-strength' | 'workflow-maturity' | 'operational-readiness';
  label: string;
  value: number;
  detail: string;
}

export interface WorkspaceOperatingManualSection {
  id: string;
  title: string;
  body: string;
  evidenceCount: number;
  updatedAt: string;
}

export interface WorkspaceIntelligenceState {
  schemaVersion: '1.0.0';
  updatedAt: string;
  dna: WorkspaceDNA;
  decisionMemory: WorkspaceDecisionMemoryEntry[];
  opportunityRadar: WorkspaceOpportunitySignal[];
  scorecard: WorkspaceScorecardMetric[];
  operatingManual: WorkspaceOperatingManualSection[];
}
