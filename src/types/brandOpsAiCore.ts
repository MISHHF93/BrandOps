export type BrandOpsAIMode = 'ask' | 'plan' | 'operate' | 'predict' | 'batch';

export type BrandOpsAISafetyLevel = 'internal' | 'review' | 'external';

export type BrandOpsAIArtifactType =
  | 'bio'
  | 'pitch'
  | 'outreach draft'
  | 'content idea'
  | 'content plan'
  | 'workflow plan'
  | 'buyer persona'
  | 'positioning statement'
  | 'opportunity analysis'
  | 'resume summary'
  | 'meeting prep'
  | 'operational plan'
  | 'approval item'
  | 'timeline event';

export type BrandOpsAIArtifactStatus = 'draft' | 'approved' | 'rejected' | 'executed' | 'archived';

export interface BrandOpsAIAuditReceipt {
  id: string;
  createdAt: string;
  mode: BrandOpsAIMode;
  validationStatus: 'passed' | 'needs_review';
  approvalRequired: boolean;
  warnings: string[];
  sourceFactsUsed: string[];
  expertsUsed: string[];
}

export interface BrandOpsAIArtifact {
  id: string;
  type: BrandOpsAIArtifactType;
  title: string;
  content: string;
  sourcePrompt: string;
  twinId?: string;
  workspaceId: string;
  createdAt: string;
  status: BrandOpsAIArtifactStatus;
  confidenceScore: number;
  sourceFactsUsed: string[];
  expertsUsed: string[];
  nextActions: string[];
  auditReceipt: BrandOpsAIAuditReceipt;
}

export interface BrandOpsAIApproval {
  id: string;
  artifactId?: string;
  reason: string;
  requiredBefore: string;
}

export interface BrandOpsAIBatchRunStep {
  id: string;
  artifactType: BrandOpsAIArtifactType;
  status: 'pending' | 'running' | 'completed' | 'failed';
  artifactId?: string;
  error?: string;
  retryCommand?: string;
}

export interface BrandOpsAIBatchRun {
  id: string;
  createdAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'partial' | 'failed';
  intent: string;
  completedArtifacts: string[];
  failedArtifacts: Array<{
    artifactType: BrandOpsAIArtifactType;
    error: string;
    retryCommand: string;
  }>;
  steps: BrandOpsAIBatchRunStep[];
  finalSummary: string;
}

export interface BrandOpsAIRequest {
  intent: string;
  mode: BrandOpsAIMode;
  twinId?: string;
  workspaceId?: string;
  userInput?: string;
  selectedArtifacts?: string[];
  requiredOutputs?: BrandOpsAIArtifactType[];
  safetyLevel: BrandOpsAISafetyLevel;
  approvalRequired: boolean;
}

export interface BrandOpsAIResponse {
  assistantMessage: string;
  artifacts: BrandOpsAIArtifact[];
  planSteps: string[];
  requiredApprovals: BrandOpsAIApproval[];
  warnings: string[];
  receipts: BrandOpsAIAuditReceipt[];
  nextActions: string[];
  batchRun?: BrandOpsAIBatchRun;
}

export interface BrandOpsAICoreState {
  schemaVersion: string;
  artifacts: BrandOpsAIArtifact[];
  batchRuns: BrandOpsAIBatchRun[];
}
