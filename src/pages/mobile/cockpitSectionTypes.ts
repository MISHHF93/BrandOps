import type { CockpitDailySnapshot } from './buildWorkspaceSnapshot';

export interface CockpitWorkstreamActions {
  btnFocus: string;
  commandBusy: boolean;
  runCommand: (command: string) => void | Promise<void>;
  primeChat: (line: string) => void;
}

export interface CockpitWorkstreamMeta {
  label: string;
  description: string;
}

export interface CockpitTodaySectionProps extends CockpitWorkstreamActions {
  snapshot: CockpitDailySnapshot;
  onOpenInAppSettings: () => void;
  meta: CockpitWorkstreamMeta;
}

export interface CockpitPipelineSectionProps extends CockpitWorkstreamActions {
  snapshot: CockpitDailySnapshot;
  meta: CockpitWorkstreamMeta;
  /** Open Workspace overview (queue table); optional cross-link from Today lanes. */
  onOpenPulse?: () => void;
}

export interface CockpitBrandContentSectionProps extends CockpitWorkstreamActions {
  snapshot: CockpitDailySnapshot;
  meta: CockpitWorkstreamMeta;
  /** Open Workspace overview (queue table); optional cross-link from Today lanes. */
  onOpenPulse?: () => void;
}

export interface CockpitConnectionsSectionProps extends CockpitWorkstreamActions {
  snapshot: CockpitDailySnapshot;
  meta: CockpitWorkstreamMeta;
}
