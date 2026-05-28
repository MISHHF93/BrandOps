import { describe, expect, it } from 'vitest';
import { composeExpertTask } from '../../src/services/ai/expertCompositionEngine';
import {
  buildExpertExplainabilityView,
  formatExpertExplainabilityLines
} from '../../src/services/ai/expertExplainabilityLayer';

describe('expertExplainabilityLayer', () => {
  it('shows which experts contributed with confidence levels', () => {
    const composition = composeExpertTask({
      userIntent: 'Plan investor outreach for our seed round with a warm intro pitch',
      mode: 'plan',
      profession: 'B2B SaaS founder',
      connectedPlatforms: ['linkedin'],
      twinProfile: {
        headline: 'Founder building workflow intelligence',
        professionalPositioning: 'B2B SaaS operator',
        hasApprovedMemory: true
      }
    });
    const view = buildExpertExplainabilityView(composition);

    expect(view.generatedUsing).toEqual([
      'Positioning Expert',
      'Outreach Expert',
      'Planning Expert',
      'Twin Memory Expert'
    ]);
    expect(view.contributors.every((contributor) => contributor.confidence.level)).toBe(true);
    expect(view.userFacingSummary).toContain('Generated using: Positioning Expert');
  });

  it('explains why suggestions appeared and what context was used', () => {
    const composition = composeExpertTask({
      userIntent: 'Build a creator growth strategy for audience and revenue using content cadence',
      mode: 'ask',
      profession: 'Creator educator',
      connectedPlatforms: ['linkedin', 'youtube'],
      behavioralMemory: {
        hasSignals: true,
        signalCount: 12,
        labels: ['weekly publishing cadence', 'audience replies']
      }
    });
    const view = buildExpertExplainabilityView(composition);

    expect(view.whySuggestionsAppeared.some((line) => /creator growth workflow/i.test(line))).toBe(
      true
    );
    expect(view.contextUsed.map((context) => context.label)).toContain('Connected platforms');
    expect(view.contextUsed.map((context) => context.label)).toContain('Behavioral memory');
  });

  it('formats operational transparency without internal chain-of-thought details', () => {
    const composition = composeExpertTask({
      userIntent: 'What does my twin remember about my voice and approved claims?',
      mode: 'ask',
      twinProfile: {
        headline: 'Fractional operator',
        professionalPositioning: 'Operational intelligence strategist',
        hasApprovedMemory: true
      }
    });
    const view = buildExpertExplainabilityView(composition);
    const text = formatExpertExplainabilityLines(view).join('\n');

    expect(text).toContain('Generated using:');
    expect(text).toContain('- Twin Memory Expert');
    expect(text).toContain('Context used:');
    expect(text).not.toMatch(/task_match|condition:|keyword_match|context_available|missing_context/);
    expect(text).not.toMatch(/chain-of-thought|hidden prompt|private deliberation/i);
    expect(view.transparencyNotes).toContain('Detailed model reasoning is intentionally omitted.');
  });
});
