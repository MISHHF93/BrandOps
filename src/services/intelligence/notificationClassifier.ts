// ---------------------------------------------------------------------------
// Notification Intelligence — Classification, Levels, and Aggregation
// ---------------------------------------------------------------------------

/** Level of notification urgency/importance. */
export type NotificationLevel = 'ACTION_REQUIRED' | 'IMPORTANT' | 'INFORMATIONAL' | 'SILENT';

/** Priority for ordering/delivery. */
export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';

/** Input used to classify a single notification. */
export interface NotificationInput {
  title: string;
  detail: string;
  source: string;
  eventType: string;
  requiresAction: boolean;
  timeSensitive: boolean;
  isFailure: boolean;
  isSecurity: boolean;
  relatedEntityIds?: string[];
  suggestedAction?: string;
}

/** A notification that has been classified. */
export interface ClassifiedNotification {
  id: string;
  title: string;
  detail: string;
  level: NotificationLevel;
  priority: NotificationPriority;
  source: string;
  timestamp: string;
  relatedEntityIds?: string[];
  suggestedAction?: string;
  acknowledged: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Priority weight for sorting (higher = more urgent). */
export const NOTIFICATION_PRIORITY_WEIGHT: Record<NotificationPriority, number> = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1
};

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

export function classifyNotification(input: NotificationInput): ClassifiedNotification {
  const now = new Date().toISOString();
  const id = `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  let level: NotificationLevel;
  let priority: NotificationPriority = 'normal';

  // Normalize eventType: accept both dot and underscore formats, and hyphens
  const et = input.eventType.replace(/[. -]/g, '_');

  // Rule 1: Security events are always ACTION_REQUIRED
  if (input.isSecurity) {
    level = 'ACTION_REQUIRED';
    priority = 'urgent';
  }
  // Rule 2: Failure events
  else if (input.isFailure) {
    if (input.timeSensitive) {
      level = 'ACTION_REQUIRED';
      priority = 'high';
    } else {
      level = 'IMPORTANT';
      priority = 'high';
    }
  }
  // Rule 3: Approval/proposal events always require user action
  else if (et === 'plan_approval_requested' || et === 'twin_proposal') {
    level = 'ACTION_REQUIRED';
    priority = input.timeSensitive ? 'high' : 'normal';
  }
  // Rule 4: Events requiring user action
  else if (input.requiresAction) {
    if (input.timeSensitive) {
      level = 'ACTION_REQUIRED';
      priority = 'high';
    } else {
      level = 'ACTION_REQUIRED';
      priority = 'normal';
    }
  }
  // Rule 4: Time-sensitive non-action events
  else if (input.timeSensitive) {
    level = 'IMPORTANT';
    priority = 'normal';
  }
  // Rule 5: Significant positive events (achievements, completions)
  else if (
    et === 'achievement_detected' ||
    et === 'achievement_verified' ||
    et === 'plan_completed' ||
    et === 'opportunity_detected' ||
    et === 'goal_advanced'
  ) {
    level = 'IMPORTANT';
    priority = 'normal';
  }
  // Rule 6: Routine operational events
  else if (
    et === 'session_connected' ||
    et === 'content_published' ||
    et === 'trace_recorded' ||
    et === 'proposal_created' ||
    et === 'context_supplied'
  ) {
    level = 'INFORMATIONAL';
    priority = 'low';
  }
  // Rule 7: Background/aggregate events
  else if (
    et === 'background_task_completed' ||
    et === 'sync_completed' ||
    et === 'verification_passed' ||
    et === 'digest_ready'
  ) {
    level = 'SILENT';
    priority = 'low';
  }
  // Default: source-based heuristics
  else {
    switch (input.source) {
      case 'plan':
      case 'twin':
      case 'agent':
        level = input.requiresAction ? 'ACTION_REQUIRED' : 'IMPORTANT';
        priority = 'normal';
        break;
      case 'integration':
      case 'sync':
        level = 'INFORMATIONAL';
        priority = 'low';
        break;
      case 'achievement':
      case 'builder':
        level = 'IMPORTANT';
        priority = 'normal';
        break;
      default:
        level = 'INFORMATIONAL';
        priority = 'low';
    }
  }

  return {
    id,
    title: input.title,
    detail: input.detail,
    level,
    priority,
    source: input.source,
    timestamp: now,
    relatedEntityIds: input.relatedEntityIds,
    suggestedAction: input.suggestedAction,
    acknowledged: false
  };
}

// ---------------------------------------------------------------------------
// Level helpers
// ---------------------------------------------------------------------------

/** Human-readable label for a notification level. */
export function notificationLevelLabel(level: NotificationLevel): string {
  switch (level) {
    case 'ACTION_REQUIRED':
      return 'Action Required';
    case 'IMPORTANT':
      return 'Important';
    case 'INFORMATIONAL':
      return 'Informational';
    case 'SILENT':
      return 'Silent (aggregated)';
  }
}

/** Whether a notification at this level should interrupt the user. */
export function notificationLevelInterrupts(level: NotificationLevel): boolean {
  return level === 'ACTION_REQUIRED' || level === 'IMPORTANT';
}

/** Whether notifications at this level are aggregated (batched into digests). */
export function notificationLevelAggregates(level: NotificationLevel): boolean {
  return level === 'SILENT';
}

/** Extract the level from a classified notification. */
export function getNotificationLevel(notification: ClassifiedNotification): NotificationLevel {
  return notification.level;
}

/** Get the numeric weight for a priority value. */
export function getPriorityWeight(priority: NotificationPriority): number {
  return NOTIFICATION_PRIORITY_WEIGHT[priority];
}

/** Convenience: should this level interrupt? */
export function shouldInterrupt(level: NotificationLevel): boolean {
  return notificationLevelInterrupts(level);
}

/** Convenience: should this level be aggregated? */
export function shouldAggregate(level: NotificationLevel): boolean {
  return notificationLevelAggregates(level);
}
