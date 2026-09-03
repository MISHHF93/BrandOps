/**
 * @vitest-environment jsdom
 *
 * The gate reaches the person, and the entitlement reaches the gate.
 *
 * Two halves, and either one missing makes the other pointless. A gate the
 * interface never consults sells something that is never withheld — which is
 * what the paywall did until this cycle. An entitlement that never reaches the
 * panel shows a paying customer the free limits, which is worse: they paid and
 * the product says no.
 *
 * The panel defaults `entitlement` to `not-entitled`, so the second failure is
 * silent and looks exactly like a free user. That default is correct — failing
 * open on the *free* tier while Pro stays closed — and it is precisely why
 * threading has to be tested rather than assumed.
 */
import { describe, expect, it } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { ConnectedAgentsPanel } from '../../src/pages/mobile/ConnectedAgentsPanel';
import { withDefaults } from '../../src/services/storage/storage';
import { populatedWorkspace } from '../helpers/populatedWorkspace';
import type { BrandOpsData } from '../../src/types/domain';
import type { EntitlementState } from '../../src/services/monetization/entitlements';
import type { ExternalAgentSession } from '../../src/types/agentInterop';

const PRO: EntitlementState = {
  status: 'entitled',
  entitlementId: 'pro',
  productIdentifier: 'brandops_pro_monthly',
  willRenew: true,
  expiresAt: null,
  verification: 'VERIFIED'
};
const FREE: EntitlementState = { status: 'not-entitled' };

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

function workspaceWith(sessions: ExternalAgentSession[]): BrandOpsData {
  const base = withDefaults(populatedWorkspace());
  return {
    ...base,
    externalAgentSessions: { ...(base.externalAgentSessions ?? {}), entries: sessions }
  } as BrandOpsData;
}

async function render(
  workspace: BrandOpsData,
  entitlement: EntitlementState | undefined,
  onUpgrade?: () => void
): Promise<string> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(
      React.createElement(ConnectedAgentsPanel, {
        loadWorkspace: async () => workspace,
        applyWorkspace: async () => {},
        entitlement,
        onUpgrade
      })
    );
  });
  const html = host.innerHTML;
  await act(async () => root.unmount());
  host.remove();
  return html;
}

const text = (html: string) =>
  new JSDOM(`<!doctype html><body>${html}</body>`).window.document.body.textContent ?? '';

describe('what the plan row tells a person', () => {
  it('says free, and names the limit', async () => {
    const body = text(await render(workspaceWith([]), FREE));

    expect(body).toContain('Free');
    // A limit nobody can see is one they discover by hitting it.
    expect(body).toContain('1 connected agent');
  });

  it('says Pro when the entitlement is Pro', async () => {
    const body = text(await render(workspaceWith([]), PRO));

    expect(body).toContain('Pro');
    expect(body).toContain('unlimited');
  });

  it('offers the upgrade only where Pro would lift something', async () => {
    const free = text(await render(workspaceWith([]), FREE, () => {}));
    const pro = text(await render(workspaceWith([]), PRO, () => {}));

    expect(free).toContain('See Pro');
    // Selling Pro to someone who already bought it is the clearest sign the
    // entitlement is not being read.
    expect(pro, 'offered an upgrade to a Pro subscriber').not.toContain('See Pro');
  });
});

describe('threading the entitlement', () => {
  it('shows free limits when no entitlement is supplied', async () => {
    /**
     * The default, asserted so it is a decision rather than an accident. It
     * fails open on free — the product works — while Pro stays closed.
     */
    const body = text(await render(workspaceWith([]), undefined));
    expect(body).toContain('Free');
  });

  it('does not show a Pro subscriber the free plan', async () => {
    // The silent failure this file exists for: a broken prop chain looks
    // exactly like a free user, and only a paying customer would notice.
    const body = text(await render(workspaceWith([session('s1')]), PRO));

    expect(body).toContain('Pro');
    expect(body).not.toContain('Free —');
  });
});
