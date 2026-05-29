import type {
  OperationalIntelligenceAction,
  OperationalIntelligenceGapQuestion,
  OperationalIntelligenceTone
} from './operationalIntelligence';

export type DailyOperatingLoopTimeframe = 'morning' | 'midday' | 'evening';

export type WorkspaceHealthCategoryId =
  | 'positioning'
  | 'audience'
  | 'content'
  | 'outreach'
  | 'operations'
  | 'integrations'
  | 'memory';

export interface WorkspaceHealthCategory {
  id: WorkspaceHealthCategoryId;
  label: string;
  score: number;
  detail: string;
  improvement: string;
  tone: OperationalIntelligenceTone;
}

export interface WorkspaceHealthScore {
  score: number;
  label: string;
  categories: WorkspaceHealthCategory[];
}

export interface DailyBriefingMetric {
  id: string;
  label: string;
  value: number;
  detail: string;
  tone: OperationalIntelligenceTone;
}

export interface ChiefOfStaffAlert {
  id: string;
  title: string;
  detail: string;
  severity: 'high' | 'medium' | 'low';
  evidence: string[];
  command: string;
}

export interface StrategicGap {
  id: string;
  title: string;
  missing: string;
  whyItMatters: string;
  recommendedFix: string;
  command: string;
}

export interface EndOfDayReflection {
  headline: string;
  completed: string[];
  tomorrow: string[];
}

export interface WorkspaceEvolutionEvent {
  id: string;
  label: string;
  detail: string;
  at: string;
}

export interface RelationshipMemorySignal {
  id: string;
  name: string;
  relationship: string;
  nextAction: string;
  signal: string;
  command: string;
}

export interface DailyOperatingLoopReadout {
  schemaVersion: '1.0.0';
  updatedAt: string;
  timeframe: DailyOperatingLoopTimeframe;
  greeting: string;
  headline: string;
  morningBriefing: string;
  recommendedPriorities: OperationalIntelligenceAction[];
  metrics: DailyBriefingMetric[];
  workspaceHealth: WorkspaceHealthScore;
  strategicGaps: StrategicGap[];
  chiefOfStaffAlerts: ChiefOfStaffAlert[];
  endOfDayReflection: EndOfDayReflection;
  tomorrowPreview: string[];
  evolutionTimeline: WorkspaceEvolutionEvent[];
  relationshipMemory: RelationshipMemorySignal[];
  missingFactQuestions: OperationalIntelligenceGapQuestion[];
  governancePolicy: string;
}
