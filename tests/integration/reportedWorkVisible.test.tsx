/**
 * @vitest-environment jsdom
 *
 * Work an agent reports about you cannot sit where you will never find it.
 *
 * Storing an achievement candidate and raising the proposal a person decides on
 * are **two different MCP tools**. `builder.activity.ingest-session-summary`
 * does the first. An agent that summarises a session and never calls the second
 * leaves the candidate in `builderActivity.achievements` — and that state had no
 * reader anywhere outside the services layer: fourteen service files wrote to
 * it, no page, no accessor, nothing read it.
 *
 * Nothing was wrong with the data. There was simply nowhere it could be seen, so
 * a claim about someone's professional work could be recorded on their behalf
 * and stay invisible to them indefinitely.
 *
 * The tests drive the real MCP handler rather than pushing a candidate onto the
 * array, because the question is whether the *product's own ingest path* leaves
 * something strandable — a hand-placed fixture would prove only that a list
 * renders.
 */
import { describe, expect, it } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { runBuilderHandler } from '../../src/services/interop/mcp/builderToolHandlers';
import { agentBridge } from '../../src/services/interop/agentBridge';
import { ConnectedAgentsPanel } from '../../src/pages/mobile/ConnectedAgentsPanel';
import { withDefaults } from '../../src/services/storage/storage';
import { populatedWorkspace } from '../helpers/populatedWorkspace';
import type { BrandOpsData } from '../../src/types/domain';

const WORK = 'Rebuilt the ingestion pipeline';

const session = {
  id: 'agent-session-1',
  clientKind: 'claude-code' as const,
  clientName: 'Claude Code',
  ownerUserId: 'local-user',
  workspaceId: 'local-workspace'
};

/** Summarise a session exactly as an agent would, and keep the workspace it returns. */
function summarise(workspace: BrandOpsData, workDescription = WORK): BrandOpsData {
  const result = runBuilderHandler(
    workspace,
    session as never,
    'builder.activity.ingest-session-summary' as never,
    {
      sessionId: `dev-session-${workDescription.length}`,
      workDescription,
      problemsSolved: ['Throughput'],
      technologiesUsed: ['TypeScript'],
      filesChanged: ['src/services/ingest.ts']
    }
  ) as { workspace: BrandOpsData; ok: boolean };
  if (!result.ok) throw new Error('the summary handler refused the fixture');
  return result.workspace;
}

/**
 * A workspace with no reported work at all.
 *
 * `populatedWorkspace()` seeds one unverified candidate ("Shipped the gateway"),
 * which is itself an example of the defect — a claim about someone's work that
 * no surface ever displayed. So the empty case has to be built rather than
 * assumed, and the first version of these tests asserted against the fixture and
 * failed, correctly.
 */
function withNothingReported(): BrandOpsData {
  const base = withDefaults(populatedWorkspace());
  return {
    ...base,
    builderActivity: { ...(base.builderActivity ?? {}), achievements: [] }
  } as BrandOpsData;
}

/**
 * Text inside the "Reported work" disclosure only.
 *
 * Scoped deliberately. An earlier version asserted the candidate's text appeared
 * anywhere in the panel and stayed green under a mutation that made the accessor
 * return nothing — the same words were already on screen in the events list. An
 * assertion that cannot fail for the reason it names is not testing that reason.
 */
function reportedWorkSection(html: string): string {
  const doc = new JSDOM(`<!doctype html><body>${html}</body>`).window.document;
  const section = [...doc.querySelectorAll('details')].find((el) =>
    el.querySelector('summary')?.textContent?.includes('Reported work')
  );
  if (!section) throw new Error('no "Reported work" section rendered');
  return section.textContent ?? '';
}

async function renderPanel(workspace: BrandOpsData): Promise<string> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(
      React.createElement(ConnectedAgentsPanel, {
        loadWorkspace: async () => workspace,
        applyWorkspace: async () => {}
      })
    );
  });
  const html = host.innerHTML;
  await act(async () => root.unmount());
  host.remove();
  return html;
}

describe('a candidate the ingest path leaves behind', () => {
  it('is created by summarising a session, with no proposal attached', () => {
    const after = summarise(withDefaults(populatedWorkspace()));

    /**
     * The premise, asserted rather than assumed. If the ingest path did raise a
     * proposal, the accessor below would correctly return nothing and every
     * assertion in this file would be vacuous.
     */
    expect((after.builderActivity?.achievements ?? []).length).toBeGreaterThan(0);
    expect(after.agentProposals?.entries ?? []).toHaveLength(0);
  });

  it('is reachable through the bridge the panel uses', () => {
    const after = summarise(withDefaults(populatedWorkspace()));

    const unclaimed = agentBridge.listUnclaimedAchievements(after);
    expect(unclaimed.length).toBeGreaterThan(0);
    expect(unclaimed.some((c) => c.title.includes(WORK) || c.description.includes(WORK))).toBe(
      true
    );
  });

  it('is empty on a workspace where nothing was reported', () => {
    expect(agentBridge.listUnclaimedAchievements(withNothingReported())).toEqual([]);
  });

  it('drops out once a proposal claims it', () => {
    /**
     * The counter-case, and the reason this is not simply "list every
     * candidate". A candidate whose proposal exists belongs in the review queue;
     * showing it in both places would read as two pieces of work.
     */
    const after = summarise(withDefaults(populatedWorkspace()));
    const candidate = (after.builderActivity?.achievements ?? [])[0];

    const claimed: BrandOpsData = {
      ...after,
      agentProposals: {
        ...(after.agentProposals ?? {}),
        entries: [
          {
            id: 'agent-proposal-1',
            kind: 'promotion',
            title: `Verify achievement: ${candidate.title}`,
            detail: 'Raised for verification.',
            rationale: 'Reported by an agent.',
            status: 'pending',
            tier: 'SENSITIVE_ACTION',
            promotion: { action: 'verify-achievement', targetId: candidate.eventId },
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
          }
        ]
      }
    } as BrandOpsData;

    expect(agentBridge.listUnclaimedAchievements(claimed)).toEqual([]);
  });
});

describe('the panel a person actually reads', () => {
  it('shows reported work that no proposal picked up', async () => {
    const section = reportedWorkSection(
      await renderPanel(summarise(withDefaults(populatedWorkspace())))
    );

    expect(section, 'the stranded candidate is not in the Reported work section').toContain(WORK);
  });

  it('says it is unverified rather than implying it counts', async () => {
    const section = reportedWorkSection(
      await renderPanel(summarise(withDefaults(populatedWorkspace())))
    );

    /**
     * The safety half. This is `AGENT_REPORTED` / `UNVERIFIED` content, and a
     * list that showed it without saying so would be the product asserting an
     * achievement on the user's behalf — exactly what the trust tiers exist to
     * prevent.
     */
    expect(section).toContain('awaiting verification');
    expect(section).toContain('not in your twin');
  });

  it('reports nothing waiting when nothing is', async () => {
    const section = reportedWorkSection(await renderPanel(withNothingReported()));

    expect(section).toContain('Nothing waiting');
    expect(section, 'an empty section still listed something').not.toContain(WORK);
  });
});
