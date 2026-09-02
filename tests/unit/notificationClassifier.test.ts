/**
 * Notification Intelligence — tests for P0-9.
 *
 * Tests notification classification, level labels, interrupt decisions,
 * priority sorting, and classification rules.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyNotification,
  NOTIFICATION_PRIORITY_WEIGHT,
  notificationLevelLabel,
  notificationLevelInterrupts,
  notificationLevelAggregates,
  shouldInterrupt,
  shouldAggregate
} from '../../src/services/intelligence/notificationClassifier';
import type { NotificationInput } from '../../src/services/intelligence/notificationClassifier';

describe('Notification Intelligence — Classification', () => {
  it('classifies security events as ACTION_REQUIRED', () => {
    const input: NotificationInput = {
      title: 'Session revoked',
      detail: 'Claude Code session was revoked',
      source: 'agent',
      eventType: 'session.revoked',
      requiresAction: true,
      timeSensitive: true,
      isFailure: false,
      isSecurity: true
    };

    const notification = classifyNotification(input);
    expect(notification.level).toBe('ACTION_REQUIRED');
    expect(notification.title).toBe('Session revoked');
    expect(notification.detail).toBe('Claude Code session was revoked');
  });

  it('classifies plan approval as ACTION_REQUIRED', () => {
    const input: NotificationInput = {
      title: 'Plan awaiting approval',
      detail: 'Content plan "Q4 Campaign" needs approval',
      source: 'plan',
      eventType: 'plan.approval-requested',
      requiresAction: true,
      timeSensitive: true,
      isFailure: false,
      isSecurity: false
    };

    const notification = classifyNotification(input);
    expect(notification.level).toBe('ACTION_REQUIRED');
  });

  it('classifies twin proposal as ACTION_REQUIRED', () => {
    const input: NotificationInput = {
      title: 'Twin update proposal',
      detail: 'Agent proposed updating skills',
      source: 'twin',
      eventType: 'twin.proposal',
      requiresAction: true,
      timeSensitive: false,
      isFailure: false,
      isSecurity: false
    };

    const notification = classifyNotification(input);
    expect(notification.level).toBe('ACTION_REQUIRED');
  });

  it('classifies achievement detected as IMPORTANT', () => {
    const input: NotificationInput = {
      title: 'Achievement detected',
      detail: 'Shipped auth system v2.0',
      source: 'achievement',
      eventType: 'achievement_detected',
      requiresAction: false,
      timeSensitive: false,
      isFailure: false,
      isSecurity: false
    };

    const notification = classifyNotification(input);
    expect(notification.level).toBe('IMPORTANT');
  });

  it('classifies plan completed as IMPORTANT', () => {
    const input: NotificationInput = {
      title: 'Plan completed',
      detail: 'Content plan executed successfully',
      source: 'plan',
      eventType: 'plan_completed',
      requiresAction: false,
      timeSensitive: false,
      isFailure: false,
      isSecurity: false
    };

    const notification = classifyNotification(input);
    expect(notification.level).toBe('IMPORTANT');
  });

  it('classifies new opportunity as IMPORTANT', () => {
    const input: NotificationInput = {
      title: 'New opportunity',
      detail: 'Hiring opportunity at Acme',
      source: 'opportunity',
      eventType: 'opportunity_detected',
      requiresAction: false,
      timeSensitive: true,
      isFailure: false,
      isSecurity: false
    };

    const notification = classifyNotification(input);
    expect(notification.level).toBe('IMPORTANT');
  });

  it('classifies content published as INFORMATIONAL', () => {
    const input: NotificationInput = {
      title: 'Content published',
      detail: 'Blog post published to LinkedIn',
      source: 'content',
      eventType: 'content_published',
      requiresAction: false,
      timeSensitive: false,
      isFailure: false,
      isSecurity: false
    };

    const notification = classifyNotification(input);
    expect(notification.level).toBe('INFORMATIONAL');
  });

  it('classifies session connected as INFORMATIONAL', () => {
    const input: NotificationInput = {
      title: 'Session connected',
      detail: 'Claude Code connected to workspace',
      source: 'agent',
      eventType: 'session_connected',
      requiresAction: false,
      timeSensitive: false,
      isFailure: false,
      isSecurity: false
    };

    const notification = classifyNotification(input);
    expect(notification.level).toBe('INFORMATIONAL');
  });

  it('classifies trace recorded as INFORMATIONAL', () => {
    const input: NotificationInput = {
      title: 'Trace recorded',
      detail: 'AI trace for query #1234',
      source: 'trace',
      eventType: 'trace_recorded',
      requiresAction: false,
      timeSensitive: false,
      isFailure: false,
      isSecurity: false
    };

    const notification = classifyNotification(input);
    expect(notification.level).toBe('INFORMATIONAL');
  });

  it('classifies background task done as SILENT', () => {
    const input: NotificationInput = {
      title: 'Background sync complete',
      detail: 'Workspace data synced to cloud',
      source: 'sync',
      eventType: 'sync_completed',
      requiresAction: false,
      timeSensitive: false,
      isFailure: false,
      isSecurity: false
    };

    const notification = classifyNotification(input);
    expect(notification.level).toBe('SILENT');
  });

  it('classifies verification passed as SILENT', () => {
    const input: NotificationInput = {
      title: 'Verification passed',
      detail: 'Achievement evidence verified',
      source: 'verification',
      eventType: 'verification_passed',
      requiresAction: false,
      timeSensitive: false,
      isFailure: false,
      isSecurity: false
    };

    const notification = classifyNotification(input);
    expect(notification.level).toBe('SILENT');
  });

  it('classifies time-sensitive failure as ACTION_REQUIRED', () => {
    const input: NotificationInput = {
      title: 'Plan execution failed',
      detail: 'Content plan failed: API timeout',
      source: 'plan',
      eventType: 'plan.execution-failed',
      requiresAction: false,
      timeSensitive: true,
      isFailure: true,
      isSecurity: false
    };

    const notification = classifyNotification(input);
    expect(notification.level).toBe('ACTION_REQUIRED');
  });

  it('classifies non-time-sensitive failure as IMPORTANT', () => {
    const input: NotificationInput = {
      title: 'Sync failed',
      detail: 'Background sync failed after retries',
      source: 'sync',
      eventType: 'sync.failed',
      requiresAction: false,
      timeSensitive: false,
      isFailure: true,
      isSecurity: false
    };

    const notification = classifyNotification(input);
    expect(notification.level).toBe('IMPORTANT');
  });
});

describe('Notification Intelligence — Level Labels and Properties', () => {
  it('returns correct label for each level', () => {
    expect(notificationLevelLabel('ACTION_REQUIRED')).toBe('Action Required');
    expect(notificationLevelLabel('IMPORTANT')).toBe('Important');
    expect(notificationLevelLabel('INFORMATIONAL')).toBe('Informational');
    expect(notificationLevelLabel('SILENT')).toBe('Silent (aggregated)');
  });

  it('only ACTION_REQUIRED and IMPORTANT interrupt', () => {
    expect(notificationLevelInterrupts('ACTION_REQUIRED')).toBe(true);
    expect(notificationLevelInterrupts('IMPORTANT')).toBe(true);
    expect(notificationLevelInterrupts('INFORMATIONAL')).toBe(false);
    expect(notificationLevelInterrupts('SILENT')).toBe(false);
  });

  it('only SILENT aggregates', () => {
    expect(notificationLevelAggregates('SILENT')).toBe(true);
    expect(notificationLevelAggregates('ACTION_REQUIRED')).toBe(false);
    expect(notificationLevelAggregates('IMPORTANT')).toBe(false);
    expect(notificationLevelAggregates('INFORMATIONAL')).toBe(false);
  });
});

describe('Notification Intelligence — Priority', () => {
  it('returns correct priority weights', () => {
    expect(NOTIFICATION_PRIORITY_WEIGHT['urgent']).toBe(4);
    expect(NOTIFICATION_PRIORITY_WEIGHT['high']).toBe(3);
    expect(NOTIFICATION_PRIORITY_WEIGHT['normal']).toBe(2);
    expect(NOTIFICATION_PRIORITY_WEIGHT['low']).toBe(1);
  });

  it('classifies urgent security events with urgent priority', () => {
    const input: NotificationInput = {
      title: 'Critical security alert',
      detail: 'Unauthorized access detected',
      source: 'agent',
      eventType: 'security.critical',
      requiresAction: true,
      timeSensitive: true,
      isFailure: false,
      isSecurity: true
    };

    const notification = classifyNotification(input);
    expect(notification.level).toBe('ACTION_REQUIRED');
    expect(notification.priority).toBe('urgent');
  });

  it('assigns appropriate priority based on severity', () => {
    // High priority: time-sensitive action required
    const input1: NotificationInput = {
      title: 'Plan approval needed',
      detail: 'Plan awaiting approval',
      source: 'plan',
      eventType: 'plan.approval-requested',
      requiresAction: true,
      timeSensitive: true,
      isFailure: false,
      isSecurity: false
    };
    expect(classifyNotification(input1).priority).toBe('high');

    // Normal priority: important but not time-sensitive
    const input2: NotificationInput = {
      title: 'Achievement detected',
      detail: 'New achievement recorded',
      source: 'achievement',
      eventType: 'achievement.detected',
      requiresAction: false,
      timeSensitive: false,
      isFailure: false,
      isSecurity: false
    };
    expect(classifyNotification(input2).priority).toBe('normal');
  });
});

describe('Notification Intelligence — Helper Functions', () => {
  it('shouldInterrupt returns true for ACTION_REQUIRED and IMPORTANT', () => {
    expect(shouldInterrupt('ACTION_REQUIRED')).toBe(true);
    expect(shouldInterrupt('IMPORTANT')).toBe(true);
    expect(shouldInterrupt('INFORMATIONAL')).toBe(false);
    expect(shouldInterrupt('SILENT')).toBe(false);
  });

  it('shouldAggregate returns true only for SILENT', () => {
    expect(shouldAggregate('SILENT')).toBe(true);
    expect(shouldAggregate('ACTION_REQUIRED')).toBe(false);
    expect(shouldAggregate('IMPORTANT')).toBe(false);
    expect(shouldAggregate('INFORMATIONAL')).toBe(false);
  });
});

describe('Notification Intelligence — Classified Notification Structure', () => {
  it('classified notification has all required fields', () => {
    const input: NotificationInput = {
      title: 'Test notification',
      detail: 'Test detail',
      source: 'test',
      eventType: 'test.event',
      requiresAction: false,
      timeSensitive: false,
      isFailure: false,
      isSecurity: false,
      relatedEntityIds: ['entity-1', 'entity-2'],
      suggestedAction: 'Review this'
    };

    const notification = classifyNotification(input);

    expect(notification.id).toBeDefined();
    expect(notification.title).toBe('Test notification');
    expect(notification.detail).toBe('Test detail');
    expect(notification.level).toBeDefined();
    expect(notification.priority).toBeDefined();
    expect(notification.source).toBe('test');
    expect(notification.timestamp).toBeDefined();
    expect(notification.relatedEntityIds).toEqual(['entity-1', 'entity-2']);
    expect(notification.suggestedAction).toBe('Review this');
    expect(notification.acknowledged).toBe(false);
  });

  it('generates unique ids for different notifications', () => {
    const input1: NotificationInput = {
      title: 'Notification 1',
      detail: 'Detail 1',
      source: 'test',
      eventType: 'test.event',
      requiresAction: false,
      timeSensitive: false,
      isFailure: false,
      isSecurity: false
    };
    const input2: NotificationInput = {
      title: 'Notification 2',
      detail: 'Detail 2',
      source: 'test',
      eventType: 'test.event',
      requiresAction: false,
      timeSensitive: false,
      isFailure: false,
      isSecurity: false
    };

    const n1 = classifyNotification(input1);
    const n2 = classifyNotification(input2);

    expect(n1.id).not.toBe(n2.id);
  });
});

describe('Notification Intelligence — Edge Cases', () => {
  it('classifies with minimal input', () => {
    const input: NotificationInput = {
      title: 'Minimal',
      detail: 'Minimal detail',
      source: 'test',
      eventType: 'test.event',
      requiresAction: false,
      timeSensitive: false,
      isFailure: false,
      isSecurity: false
    };

    const notification = classifyNotification(input);
    expect(notification).toBeDefined();
    expect(notification.level).toBe('INFORMATIONAL');
  });

  it('handles empty relatedEntityIds', () => {
    const input: NotificationInput = {
      title: 'No entities',
      detail: 'Detail',
      source: 'test',
      eventType: 'test.event',
      requiresAction: false,
      timeSensitive: false,
      isFailure: false,
      isSecurity: false
    };

    const notification = classifyNotification(input);
    expect(notification.relatedEntityIds).toBeUndefined();
  });

  it('handles empty suggestedAction', () => {
    const input: NotificationInput = {
      title: 'No action suggested',
      detail: 'Detail',
      source: 'test',
      eventType: 'test.event',
      requiresAction: false,
      timeSensitive: false,
      isFailure: false,
      isSecurity: false
    };

    const notification = classifyNotification(input);
    expect(notification.suggestedAction).toBeUndefined();
  });

  it('acknowledged defaults to false', () => {
    const input: NotificationInput = {
      title: 'New notification',
      detail: 'Detail',
      source: 'test',
      eventType: 'test.event',
      requiresAction: false,
      timeSensitive: false,
      isFailure: false,
      isSecurity: false
    };

    const notification = classifyNotification(input);
    expect(notification.acknowledged).toBe(false);
  });
});

describe('Notification Intelligence — Source-Based Classification', () => {
  it('classifies plan.approval-requested as ACTION_REQUIRED regardless of other flags', () => {
    const input: NotificationInput = {
      title: 'Plan approval',
      detail: 'Plan needs approval',
      source: 'plan',
      eventType: 'plan.approval-requested',
      requiresAction: false, // Even if requiresAction is false
      timeSensitive: false,
      isFailure: false,
      isSecurity: false
    };

    const notification = classifyNotification(input);
    expect(notification.level).toBe('ACTION_REQUIRED');
  });

  it('classifies twin.proposal as ACTION_REQUIRED', () => {
    const input: NotificationInput = {
      title: 'Twin proposal',
      detail: 'Proposal from agent',
      source: 'twin',
      eventType: 'twin.proposal',
      requiresAction: false,
      timeSensitive: false,
      isFailure: false,
      isSecurity: false
    };

    const notification = classifyNotification(input);
    expect(notification.level).toBe('ACTION_REQUIRED');
  });

  it('classifies verification.passed as SILENT', () => {
    const input: NotificationInput = {
      title: 'Verification passed',
      detail: 'Verification succeeded',
      source: 'verification',
      eventType: 'verification.passed',
      requiresAction: false,
      timeSensitive: false,
      isFailure: false,
      isSecurity: false
    };

    const notification = classifyNotification(input);
    expect(notification.level).toBe('SILENT');
  });
});
