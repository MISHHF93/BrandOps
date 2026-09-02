/**
 * What does BrandOps claim, for someone who has done nothing?
 *
 * Cycle 46 asked that of the completed list and found three fabricated receipts.
 * Asked of the rest of the plan surface, it found two more things:
 *
 * **Work reported as underway that had never begun.** Five plan templates —
 * "Workflow Plan", "Outreach Plan", "Content Calendar" and the rest — are always
 * present, and all five were filed as `active-plan`, which puts them under a
 * heading reading "In progress" with the hint "Already underway." The tile above
 * counted them too: **"Active Plans: 4"** on a workspace with no plans. They are
 * offers. A card reports progress only once its own status says so.
 *
 * **Confidence that rose on absence.** Opportunity confidence is scored from how
 * many signals a suggestion has, and the collectors emit a line per fact whether
 * or not the fact exists: `"Connected apps: none"`, `"0 active opportunities"`,
 * `"0 open follow-ups"`. Each added two points. So "Identify growth
 * opportunities from profile and pipeline" scored **85%** on an empty workspace,
 * with seven supporting signals, every one of which said there was nothing
 * there. The named `sources` list compounded it: a hardcoded literal at every
 * call site, worth up to twenty points, claimed for sources that held nothing.
 */
import { describe, expect, it } from 'vitest';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { buildOperationalPlanCards } from '../../src/pages/mobile/PlanOperationalStudio';
import { isAbsenceSignal } from '../../src/services/plan/predictiveOpportunityLayer';
import { withDefaults } from '../../src/services/storage/storage';
import { cloneDemoSampleData } from '../helpers/fixtures';
import type { BrandOpsData } from '../../src/types/domain';

const empty = (): BrandOpsData => withDefaults({} as never);

describe('a workspace with nothing in it', () => {
  it('has no plan underway', () => {
    const cards = buildOperationalPlanCards(buildWorkspaceSnapshot(empty()));

    // The templates still exist — they are what the product offers. None of them
    // may claim to be running.
    expect(cards.length, 'no templates offered at all').toBeGreaterThan(0);
    expect(
      cards.filter((card) => card.status === 'in-progress').map((card) => card.title),
      'templates reporting progress on an empty workspace'
    ).toEqual([]);
  });

  it('offers the templates without calling them started', () => {
    const cards = buildOperationalPlanCards(buildWorkspaceSnapshot(empty()));
    // The counter-case: hiding them entirely would also satisfy the test above
    // and would leave a new user with nothing to do.
    expect(cards.some((card) => card.status === 'ready' || card.status === 'needs-input')).toBe(
      true
    );
  });

  it('scores no suggestion as near-certain', () => {
    const snapshot = buildWorkspaceSnapshot(empty());
    const unsupported = snapshot.predictiveOpportunityLayer.suggestions.filter((suggestion) =>
      suggestion.supportingSignals.every((signal) => /connect more sources/i.test(signal))
    );

    // A suggestion whose only remaining signal is "connect more sources to
    // strengthen this" is exactly the one that must not read as near-certain.
    for (const suggestion of unsupported) {
      expect(suggestion.confidence, `${suggestion.title} @ ${suggestion.confidence}%`).toBeLessThan(
        75
      );
    }
  });

  it('never offers a statement of absence as supporting evidence', () => {
    const snapshot = buildWorkspaceSnapshot(empty());
    const absent = snapshot.predictiveOpportunityLayer.suggestions.flatMap((suggestion) =>
      suggestion.supportingSignals.filter(isAbsenceSignal)
    );

    // "0 outreach drafts" listed under "supporting signals" is evidence that
    // there is no evidence.
    expect(absent, `absence offered as support: ${absent.join(' | ')}`).toEqual([]);
  });
});

describe('the absence predicate', () => {
  it('recognises the shapes the collectors actually emit', () => {
    for (const signal of [
      '0 active opportunities',
      '0 open follow-ups',
      '0 outreach drafts',
      'Connected apps: none',
      'Connected apps: None'
    ]) {
      expect(isAbsenceSignal(signal), signal).toBe(true);
    }
  });

  it('leaves real signals alone', () => {
    // Deliberately narrow. A real signal that merely contains a zero, or the
    // word "none" mid-sentence, still counts as evidence.
    for (const signal of [
      '3 active opportunities',
      'Primary offer: 0-to-1 AI architecture for enterprise teams',
      'Voice guide: none of the usual startup cliches',
      'Reusable Outreach Workflow: drafts and follow-ups are recurring'
    ]) {
      expect(isAbsenceSignal(signal), signal).toBe(false);
    }
  });
});

describe('a workspace with real content', () => {
  it('still scores its suggestions from what is there', () => {
    const populated = buildWorkspaceSnapshot(cloneDemoSampleData());
    const scores = populated.predictiveOpportunityLayer.suggestions.map((s) => s.confidence);

    // The counter-case for the whole cycle: filtering absence must not deflate
    // a workspace that genuinely has evidence.
    expect(scores.length).toBeGreaterThan(4);
    expect(Math.max(...scores)).toBeGreaterThanOrEqual(90);
  });
});
