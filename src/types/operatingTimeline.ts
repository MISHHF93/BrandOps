export type BrandOpsOperatingTimelineCategory =
  | 'decision'
  | 'generated-plan'
  | 'approved-output'
  | 'rejected-idea'
  | 'outreach-sequence'
  | 'workflow-evolution'
  | 'positioning-change'
  | 'operational-milestone'
  | 'ai-recommendation'
  | 'connected-platform-event'
  | 'artifact'
  | 'batch-run';

export type BrandOpsOperatingTimelineTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted'
  | 'primary';

export interface BrandOpsOperatingTimelineEvent {
  id: string;
  at: string;
  category: BrandOpsOperatingTimelineCategory;
  title: string;
  detail: string;
  source: string;
  tone: BrandOpsOperatingTimelineTone;
  entityType?: string;
  entityId?: string;
  replayCommand?: string;
  confidence?: number;
}

export interface BrandOpsOperatingTimelineState {
  schemaVersion: string;
  events: BrandOpsOperatingTimelineEvent[];
}
