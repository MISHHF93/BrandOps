/**
 * The gate that actually stops an unauthenticated user, verified in the shipped
 * artifact rather than in the source that produced it.
 *
 * Cycle 19 fixed an ungated `Convert` control on the plan hub and this cycle set
 * out to check the other four surfaces the same way. Driving them showed
 * something worth correcting about that earlier finding.
 *
 * `Today` and `Integrations` render with **no lock affordance at all** — 52 and
 * 24 controls, none disabled, firing 15 and 24 workspace commands under a click
 * sweep — and `runAgentQuick`, the shared entry every surface routes through,
 * checks only `!trimmed || commandLoading`. Read alone, that looks like a hole.
 *
 * It is not, and the reason is the shell. When `shouldRequireLaunchAuth` is
 * true the mobile shell renders `LaunchAuthGate` *instead of* any tab surface,
 * so those controls are never reachable while locked. The hub's
 * `canRunWorkspaceCommands` is a second layer beneath that one.
 *
 * Which means cycle 19's `Convert` gap was a real inconsistency in a layer that
 * a live user cannot currently reach — defence in depth with a hole in it, not
 * an open door. Worth fixing, worth not overstating.
 *
 * The gate that does the work had no test. Two things are asserted here: the
 * decision it makes for every combination of inputs, and that the decision
 * survives into the built bundle, which is the artifact a user actually runs.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  canOpenLaunchWorkspace,
  shouldRequireLaunchAuth,
  shouldRequireLaunchMembership
} from '../../src/shared/account/launchLifecycleGate';
import { getAgentCommandLock } from '../../src/pages/mobile/agentCommandAccess';
import type { LaunchAccessState, MembershipStatus } from '../../src/shared/account/launchAccess';
import type { MobileShellTabId } from '../../src/pages/mobile/mobileShellQuery';

/** A real Vite build, which is slower than the 5s default by a wide margin. */
const BUILD_TIMEOUT = 180_000;

const MEMBERSHIPS: MembershipStatus[] = ['none', 'trialing', 'active', 'past_due', 'canceled'];
const TABS: MobileShellTabId[] = ['chat', 'workspace', 'daily', 'integrations', 'settings'];

function access(isAuthenticated: boolean, status: MembershipStatus): LaunchAccessState {
  return {
    auth: { isAuthenticated, provider: isAuthenticated ? 'google' : null, email: '' },
    membership: { status }
  } as LaunchAccessState;
}

describe('the launch gate decides the same way for every input', () => {
  it('requires auth from anyone not signed in, on every tab', () => {
    // Enumerated rather than sampled: a tab added later is covered without
    // anyone remembering this file exists.
    for (const status of MEMBERSHIPS) {
      const state = access(false, status);
      expect(shouldRequireLaunchAuth(state), status).toBe(true);
      expect(canOpenLaunchWorkspace(state), status).toBe(false);
      for (const tab of TABS) {
        // Including `settings`. The settings exemption is for the *membership*
        // gate — somewhere to fix your billing — and must not extend to auth.
        expect(getAgentCommandLock(state, tab), `${status}/${tab}`).toBe('auth');
      }
    }
  });

  it('lets a signed-in user through on every tab', () => {
    for (const status of MEMBERSHIPS) {
      const state = access(true, status);
      expect(shouldRequireLaunchAuth(state), status).toBe(false);
      for (const tab of TABS) {
        // The membership gate is disabled outside dev by design — the source
        // says so plainly: production billing needs verified server-side
        // entitlements, which this build does not ship. So a signed-in user is
        // never blocked here, whatever their membership says.
        expect(getAgentCommandLock(state, tab), `${status}/${tab}`).toBeNull();
      }
    }
  });

  it('does not treat membership as a security boundary', () => {
    // Recorded because it would otherwise look like a bug. Enforcing an
    // unverifiable entitlement client-side would be theatre; the honest position
    // is that it is off, and stated.
    expect(shouldRequireLaunchMembership(access(true, 'none'))).toBe(false);
    expect(shouldRequireLaunchMembership(access(true, 'canceled'))).toBe(false);
  });
});

describe('the decision survives into the artifact a user runs', () => {
  const CHUNK = 'dist/chunks/launchLifecycleGate.js';

  it('has a build to inspect', () => {
    // Fails rather than skips: an unverified artifact must not pass as a
    // verified one.
    expect(
      existsSync(CHUNK),
      `${CHUNK} is missing — run \`npx vite build\` before the suite.`
    ).toBe(true);
  });

  it('still checks authentication after minification', () => {
    const source = readFileSync(CHUNK, 'utf8');
    /**
     * The negated read has to survive into the bundle, because that bundle is
     * what a user runs. It compiles to
     * `function je(t){return Ln()?!1:!t.auth.isAuthenticated}`, where `Ln` is
     * the skip predicate reduced to a constant `false`.
     *
     * The assertion is the *negated read*, not a whole-expression shape. An
     * earlier version pinned `return!t.auth.isAuthenticated` and broke on a
     * build where the minifier kept the call instead of inlining it — pinning
     * the optimiser's output rather than the property. The negated read is the
     * discriminator that was actually measured: present once when the wall
     * ships, absent entirely when it was folded away.
     */
    expect(
      /!\w+\.auth\.isAuthenticated/.test(source),
      'the built bundle does not negate auth.isAuthenticated'
    ).toBe(true);
  });

  it(
    'cannot have the wall removed by a build-time flag',
    () => {
      /**
       * The structural property, and the reason this test builds rather than
       * reads. `VITE_SKIP_LAUNCH_AUTH=1` on a *production* build used to inline
       * to `true`, fold `shouldRequireLaunchAuth` to `false`, and delete the
       * authentication wall from the shipped output — measured, not theorised:
       * the negated `auth.isAuthenticated` read went from one occurrence to zero.
       *
       * The assertion above could not catch that on its own. It reads whichever
       * `dist/` happens to exist, so it only fires when the hostile build is the
       * one left lying around at test time; someone building a release with the
       * flag set and uploading it straight to a store never trips it. A detector
       * that depends on ambient state is not a gate.
       *
       * So this builds the hostile case on purpose, into a throwaway directory,
       * and asserts the wall is still there. `isLaunchAuthSkipped` now returns
       * early on `!import.meta.env.DEV`, which folds to a constant in any
       * production build and makes the skip unreachable before the flag is read.
       * Developer mode keeps working under `npm run dev`, where `DEV` is true.
       */
      const outDir = mkdtempSync(join(tmpdir(), 'brandops-authgate-'));
      try {
        execSync(`npx vite build --mode production --outDir "${outDir}" --emptyOutDir`, {
          env: { ...process.env, VITE_SKIP_LAUNCH_AUTH: '1' },
          stdio: 'pipe'
        });
        const built = readFileSync(join(outDir, 'chunks/launchLifecycleGate.js'), 'utf8');
        expect(
          /!\w+\.auth\.isAuthenticated/.test(built),
          'a production build with VITE_SKIP_LAUNCH_AUTH=1 shipped without an auth wall'
        ).toBe(true);
      } finally {
        rmSync(outDir, { recursive: true, force: true });
      }
    },
    BUILD_TIMEOUT
  );

  it('ships no build-time auth-skip flag', () => {
    const source = readFileSync(CHUNK, 'utf8');
    // The flag name surviving into output would mean it was read at runtime
    // rather than inlined, which is a different and less predictable gate.
    expect(source).not.toContain('VITE_SKIP_LAUNCH_AUTH');
  });
});
