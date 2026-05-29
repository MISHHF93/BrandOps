import type {
  WorkspaceDecisionMemoryEntry,
  WorkspaceDNA,
  WorkspaceOpportunitySignal,
  WorkspaceScorecardMetric
} from './workspaceIntelligence';

export type OperationalIntelligenceTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted'
  | 'primary';

export type OperationalIntelligenceActionSource =
  | 'workspace-dna'
  | 'decision-memory'
  | 'opportunity-radar'
  | 'approval-queue'
  | 'execution-receipts'
  | 'ai-core';

export interface OperationalIntelligenceBriefingItem {
  id: string;
  label: string;
  detail: string;
  evidence: string[];
  tone: OperationalIntelligenceTone;
}

export interface OperationalIntelligenceAction {
  id: string;
  source: OperationalIntelligenceActionSource;
  title: string;
  detail: string;
  why: string;
  confidence: number;
  expectedImpact: 'high' | 'medium' | 'low';
  evidence: string[];
  command: string;
  primaryLabel: string;
  approvalRequired: boolean;
  tone: OperationalIntelligenceTone;
}

export interface OperationalIntelligenceGapQuestion {
  id: string;
  question: string;
  whyItMatters: string;
  target: 'workspace-dna' | 'digital-twin' | 'decision-memory' | 'platform-context';
  command: string;
}

export interface OperationalIntelligenceReceiptContext {
  totalReceipts: number;
  pendingApprovals: number;
  approvedDecisions: number;
  rejectedDecisions: number;
  latestReceiptSummary: string;
}

export interface OperationalIntelligenceCoreReadout {
  schemaVersion: '1.0.0';
  updatedAt: string;
  headline: string;
  operatingStance: string;
  dna: WorkspaceDNA;
  scorecard: WorkspaceScorecardMetric[];
  decisionMemory: WorkspaceDecisionMemoryEntry[];
  opportunityRadar: WorkspaceOpportunitySignal[];
  briefing: OperationalIntelligenceBriefingItem[];
  recommendedActions: OperationalIntelligenceAction[];
  attentionQueue: OperationalIntelligenceAction[];
  missingFactQuestions: OperationalIntelligenceGapQuestion[];
  receiptContext: OperationalIntelligenceReceiptContext;
  governancePolicy: string;
}
