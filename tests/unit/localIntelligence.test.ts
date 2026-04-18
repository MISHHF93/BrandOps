import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { localIntelligence } from '../../src/services/intelligence/localIntelligence';
import { cloneDemoSampleData } from '../helpers/fixtures';

describe('localIntelligence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-11T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('prioritizes ready lead-oriented content over weaker ideas', () => {
    const data = cloneDemoSampleData();
    const ranked = localIntelligence.contentPriority([
      {
        ...data.contentLibrary[0],
        id: 'weak-idea',
        status: 'idea',
        tags: [],
        goal: 'General awareness'
      },
      {
        ...data.contentLibrary[1],
        id: 'strong-ready',
        status: 'ready',
        tags: ['ai', 'ops', 'delivery'],
        goal: 'Drive discovery call interest from lead generation content'
      }
    ]);

    expect(ranked.map((item) => item.id)).toEqual(['strong-ready', 'weak-idea']);
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it('filters archived drafts and ranks stale ready outreach highest', () => {
    const data = cloneDemoSampleData();
    const ranked = localIntelligence.outreachUrgency([
      {
        ...data.outreachDrafts[0],
        id: 'stale-ready',
        status: 'ready',
        outreachGoal: 'Book a call',
        updatedAt: '2026-04-07T12:00:00.000Z'
      },
      {
        ...data.outreachDrafts[1],
        id: 'fresh-replied',
        status: 'replied',
        outreachGoal: 'Share notes',
        updatedAt: '2026-04-11T10:00:00.000Z'
      },
      {
        ...data.outreachDrafts[1],
        id: 'archived',
        status: 'archived',
        updatedAt: '2026-04-01T10:00:00.000Z'
      }
    ]);

    expect(ranked).toHaveLength(2);
    expect(ranked[0].id).toBe('stale-ready');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it('surfaces the most overdue work first and rewards healthier pipeline entries', () => {
    const data = cloneDemoSampleData();

    data.followUps = [
      {
        ...data.followUps[0],
        id: 'urgent-follow-up',
        reason: 'Overdue by a day',
        dueAt: '2026-04-10T10:00:00.000Z',
        completed: false
      },
      {
        ...data.followUps[1],
        id: 'later-follow-up',
        reason: 'Due tomorrow',
        dueAt: '2026-04-12T18:00:00.000Z',
        completed: false
      }
    ];
    data.opportunities = [
      {
        ...data.opportunities[0],
        id: 'healthy',
        status: 'proposal',
        valueUsd: 42000,
        confidence: 84,
        followUpDate: '2026-04-12T15:00:00.000Z'
      },
      {
        ...data.opportunities[1],
        id: 'lost',
        status: 'lost',
        valueUsd: 3000,
        confidence: 10,
        followUpDate: '2026-04-11T18:00:00.000Z'
      }
    ];

    const risk = localIntelligence.overdueRisk(data);
    const health = localIntelligence.pipelineHealth(data.opportunities);

    expect(risk[0].id).toBe('urgent-follow-up');
    expect(risk[0].score).toBeGreaterThan(risk[1].score);
    expect(health[0].id).toBe('healthy');
    expect(health[0].score).toBeGreaterThan(health[1].score);
  });

  it('creates publish guidance for unscheduled, urgent, and healthy queue items', () => {
    const data = cloneDemoSampleData();
    const recommendations = localIntelligence.publishingRecommendations([
      {
        ...data.publishingQueue[0],
        id: 'unscheduled',
        scheduledFor: undefined
      },
      {
        ...data.publishingQueue[0],
        id: 'urgent',
        scheduledFor: '2026-04-11T13:00:00.000Z'
      },
      {
        ...data.publishingQueue[1],
        id: 'tomorrow',
        scheduledFor: '2026-04-12T06:00:00.000Z'
      }
    ]);

    expect(recommendations.map((item) => item.title)).toEqual([
      expect.stringContaining('No schedule set'),
      expect.stringContaining('Publish-ready check'),
      expect.stringContaining('Prep supporting assets')
    ]);
  });

  it('suggests snippets with the strongest wording overlap', () => {
    const suggestions = localIntelligence.templateSuggestionsFromVault(
      [
        'Reliable AI workflows need explicit review checkpoints before launch.',
        'Gardening notes about tomatoes and irrigation schedules.',
        'Weekly reviews catch ownership gaps before they become delivery failures.'
      ],
      'This launch plan needs explicit review checkpoints and clear ownership gaps resolved.'
    );

    expect(suggestions[0]).toContain('explicit review checkpoints');
    expect(suggestions).toHaveLength(3);
  });
});
