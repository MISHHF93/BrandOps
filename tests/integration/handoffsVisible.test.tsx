/**
 * @vitest-environment jsdom
 *
 * A delegation between agents is visible to the person whose workspace it is.
 *
 * The service in `handoffs.ts` enforces that a handoff can only narrow. This
 * file is about the other half, and it is the half this repository keeps getting
 * wrong: a capability with no reader outside the services layer. Three cycles in
 * a row found exactly that shape — `twinProposals`, `twinVersionHistory`,
 * `builderActivity.achievements` — so building a fourth one would have been
 * perverse.
 *
 * What the row has to show is not the handoff's stored `requiredCapabilities`.
 * That is what was *asked for*. What matters to a reader is what the target can
 * do **now**, which is recomputed on every render and goes empty the moment the
 * handoff lapses or that session is revoked. Displaying the stored list would be
 * the frozen-grant bug rendered as a label: it would keep claiming access that
 * revocation had already taken away.
 */
import { describe, expect, it } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { decideHandoff, proposeHandoff, startHandoff } from '../../src/services/interop/handoffs';
import { ConnectedAgentsPanel } from '../../src/pages/mobile/ConnectedAgentsPanel';
import { withDefaults } from '../../src/services/storage/storage';
import { populatedWorkspace } from '../helpers/populatedWorkspace';
import type { BrandOpsData } from '../../src/types/domain';
import type { ExternalAgentSession } from '../../src/types/agentInterop';

const NOW = '2026-06-01T12:00:00.000Z';
const OBJECTIVE = 'Draft the release notes';

function session(id: string, status: 'active' | 'revoked' = 'active'): ExternalAgentSession {
  return {
    id,
    ownerUserId: 'local-user',
    workspaceId: 'local-workspace',
    clientKind: 'claude-code',
    clientName: id,
    tokenHash: `hash-${id}`,
    status,
    grantedBundles: ['PUBLIC_IDENTITY'],
    grantedCapabilities: ['context.read'],
    createdAt: '2026-06-01T06:00:00.000Z',
    lastActivityAt: '2026-06-01T06:00:00.000Z'
  };
}

function twoSessions(targetStatus: 'active' | 'revoked' = 'active'): BrandOpsData {
  const base = withDefaults(populatedWorkspace());
  return {
    ...base,
    externalAgentSessions: {
      ...(base.externalAgentSessions ?? {}),
      entries: [session('session-source'), session('session-target', targetStatus)]
    }
  } as BrandOpsData;
}

/** Drive the real service to a running handoff, rather than hand-building one. */
function running(workspace: BrandOpsData): { workspace: BrandOpsData; id: string } {
  const proposed = proposeHandoff(
    workspace,
    {
      sourceSessionId: 'session-source',
      targetSessionId: 'session-target',
      objective: OBJECTIVE,
      requiredCapabilities: ['context.read'],
      minimumContext: ['PUBLIC_IDENTITY'],
      prohibitedActions: ['publish'],
      expectedOutput: 'A markdown summary',
      budget: { toolCallLimit: 5 }
    },
    NOW
  );
  if (!proposed.ok) throw new Error(`the service refused the fixture: ${proposed.error}`);
  const accepted = decideHandoff(proposed.workspace, proposed.handoff!.id, 'accepted', NOW);
  const started = startHandoff(accepted.workspace, proposed.handoff!.id, NOW);
  return { workspace: started.workspace, id: proposed.handoff!.id };
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

/** Text inside the Handoffs disclosure only, so a match cannot come from elsewhere. */
function handoffSection(html: string): string {
  const doc = new JSDOM(`<!doctype html><body>${html}</body>`).window.document;
  const section = [...doc.querySelectorAll('details')].find((el) =>
    el.querySelector('summary')?.textContent?.includes('Handoffs')
  );
  if (!section) throw new Error('no "Handoffs" section rendered');
  return section.textContent ?? '';
}

describe('the handoffs a person can see', () => {
  it('shows the objective and who it went to', async () => {
    const { workspace } = running(twoSessions());
    const section = handoffSection(await renderPanel(workspace));

    expect(section).toContain(OBJECTIVE);
    expect(section).toContain('session-target');
  });

  it('shows what the target can actually do right now', async () => {
    const { workspace } = running(twoSessions());
    const section = handoffSection(await renderPanel(workspace));

    expect(section).toContain('Can currently use');
    expect(section).toContain('context.read');
  });

  it('stops claiming access once the target session is revoked', async () => {
    /**
     * The assertion that makes the previous one mean something. The stored
     * `requiredCapabilities` still says `context.read`; rendering that would
     * keep advertising access the revocation already removed.
     */
    const { workspace } = running(twoSessions());
    const revoked = {
      ...workspace,
      externalAgentSessions: {
        ...workspace.externalAgentSessions!,
        entries: workspace.externalAgentSessions!.entries.map((e) =>
          e.id === 'session-target' ? { ...e, status: 'revoked' as const } : e
        )
      }
    } as BrandOpsData;

    const section = handoffSection(await renderPanel(revoked));

    expect(section).toContain('Grants no access right now');
    expect(section, 'still advertising a capability after revocation').not.toContain(
      'Can currently use'
    );
  });

  it('shows the budget as spent against its limit', async () => {
    const { workspace } = running(twoSessions());
    const section = handoffSection(await renderPanel(workspace));

    // A budget nobody can see is a budget nobody can question.
    expect(section).toContain('Tool calls: 0 of 5');
  });

  it('shows what the handoff forbids', async () => {
    const { workspace } = running(twoSessions());
    expect(handoffSection(await renderPanel(workspace))).toContain('Must not: publish');
  });

  it('offers a way to withdraw a live one', async () => {
    const { workspace } = running(twoSessions());
    expect(handoffSection(await renderPanel(workspace))).toContain('Cancel handoff');
  });

  it('says so plainly when there are none', async () => {
    const section = handoffSection(await renderPanel(twoSessions()));

    expect(section).toContain('No handoffs');
    expect(section).not.toContain(OBJECTIVE);
  });
});
