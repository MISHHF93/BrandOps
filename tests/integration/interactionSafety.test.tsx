/**
 * @vitest-environment jsdom
 *
 * What the interface does when someone actually presses it.
 *
 * Recorded for several cycles as blocked "pending a renderer". It was not.
 * `jsdom` is a dependency, `react-dom/client` mounts into it, handlers fire and
 * `document.activeElement` updates. Verifying that took one command, and I had
 * repeated the blocker without running it.
 *
 * Still genuinely out of reach, and narrower than "a renderer": colour contrast,
 * focus *visibility*, and reflow at viewport widths are decided by layout and
 * paint. Not asserted here.
 *
 * ---
 *
 * **The first version of this file passed while proving nothing, and the test
 * that caught it is the one worth keeping.**
 *
 * It clicked every enabled control on a locked workspace, saw no command run,
 * and concluded the lock held. The counter-case — the same sweep on an *unlocked*
 * workspace — ran nothing either. The sweep was measuring a broken harness, not
 * a working lock.
 *
 * Two reasons, both worth knowing. The harness watched one callback out of six.
 * And this surface's actions are mostly two-step: a click expands a row, and the
 * action button appears inside it, so a single pass over the initial buttons
 * reaches almost nothing. Exactly two controls fire in one pass.
 *
 * So the assertions below are narrowed to what is actually demonstrable: the
 * *disabled state* of every action control, which the platform enforces for both
 * pointer and keyboard. What remains unproven is named at the bottom rather than
 * papered over.
 */
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { MobileWorkspaceHubView } from '../../src/pages/mobile/MobileWorkspaceHubView';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { cloneDemoSampleData } from '../helpers/fixtures';

const mounted: Array<{ root: Root; container: HTMLElement }> = [];

afterEach(() => {
  for (const entry of mounted.splice(0)) {
    act(() => entry.root.unmount());
    entry.container.remove();
  }
});

interface Harness {
  container: HTMLElement;
  fired: string[];
  buttons: () => HTMLButtonElement[];
  labelled: (pattern: RegExp) => HTMLButtonElement[];
}

async function mountHub(locked: boolean): Promise<Harness> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const fired: string[] = [];
  const root = createRoot(container);
  mounted.push({ root, container });

  await act(async () => {
    root.render(
      React.createElement(MobileWorkspaceHubView, {
        snapshot: buildWorkspaceSnapshot(cloneDemoSampleData()),
        btnFocus: '',
        commandBusy: false,
        // Every channel, not one. Watching `runCommand` alone is what made the
        // first version of this file measure nothing.
        runCommand: (command: string) => fired.push(`runCommand:${command}`),
        onOpenToday: () => fired.push('onOpenToday'),
        onOpenSettings: () => fired.push('onOpenSettings'),
        onOpenIntegrations: () => fired.push('onOpenIntegrations'),
        onOpenCommandPalette: () => fired.push('onOpenCommandPalette'),
        onDownloadPipelineRun: () => fired.push('onDownloadPipelineRun'),
        onApproveOperatorTrace: async () => {
          fired.push('onApproveOperatorTrace');
        },
        launchAccess: {
          auth: { isAuthenticated: true, provider: 'google', email: 'operator@fixture.test' },
          membership: { status: 'active' }
        },
        firstRunJourneyVisible: true,
        canRunWorkspaceCommands: !locked,
        /**
         * `'membership'`, not `'Membership required'`.
         *
         * The prop's type is `'auth' | 'membership' | null`, and the harness was
         * casting past it with `as never`. The view maps the reason to its
         * explanatory banner through a switch that knows only those two values,
         * so an unrecognised string produced no banner at all — meaning this
         * suite, whose entire subject is the locked state, had never rendered
         * the one element that explains the lock and offers the way out of it.
         *
         * The app passes the same value to both props from one source, so
         * locked always has a reason. The harness now matches that.
         */
        workspaceCommandLockReason: locked ? 'membership' : null
      } as never)
    );
  });

  const buttons = () => Array.from(container.querySelectorAll('button'));
  return {
    container,
    fired,
    buttons,
    labelled: (pattern) =>
      buttons().filter((button) =>
        pattern.test(`${button.textContent ?? ''} ${button.getAttribute('aria-label') ?? ''}`)
      )
  };
}

/**
 * Controls that act on the workspace rather than navigate around it.
 *
 * `Convert` joined this list after cycle 18 left its gating unverified. Driving
 * the interaction showed why: of eight feed items, seven set `primaryDisabled`
 * and the opportunity card did not — so a locked workspace disabled its `Review`
 * action and left `Convert` live, and converting an opportunity writes a plan.
 */
const ACTION_CONTROL = /^\s*(Approve|Review|Handle|Explain|Convert|Fill gaps|Add input)\s*$/;

/**
 * Controls that stay live while locked, on purpose.
 *
 * Two kinds, and the distinction is the point. Navigation and filtering read the
 * workspace without changing it, so gating them would make a locked workspace
 * unreadable as well as unusable. `Set up` and `Open setup` route to the screens
 * that lift the lock — disabling those strands the user inside it. `Export` is
 * read-only: someone who cannot run commands should still get their data out.
 *
 * Enumerated rather than inferred, so a control that appears here is a decision
 * somebody made. The counted tiles are matched by prefix because their labels
 * carry live numbers.
 *
 * `Show N more` joined when the plan feed was grouped: expanding a group reveals
 * items whose summaries are already on screen. It discloses, it does not act.
 * The old `All`/`Active`/`Recent` chips left at the same time — they duplicated
 * the tiles exactly, and the tiles now toggle.
 *
 * `Open Settings` joined when the duplicated "Start here" card was removed. That
 * card had been the only enabled control on a locked plan page that reached
 * Settings, and losing it stranded the user inside the lock — which the sibling
 * test caught immediately. The route now sits on the banner that already tells
 * the reader to open Settings, which is where it should have been: the same
 * category as `Set up`, and live for the same reason.
 */
const READ_ONLY_CONTROL =
  /^(Set up|Review gaps|Open setup|Open Settings|Add work|Export|Show \d+ more|Twin Status|Active Plans|Pending Approvals|Opportunities)/;

describe('a locked workspace disables its action controls', () => {
  it('disables every approve, review, handle and explain control', async () => {
    const harness = await mountHub(true);
    const controls = harness.labelled(ACTION_CONTROL);

    // Finding none would make the assertion below vacuous.
    expect(controls.length, 'no action controls found').toBeGreaterThan(10);
    const stillEnabled = controls.filter((button) => !button.disabled);
    expect(
      stillEnabled.map((b) => b.textContent),
      'enabled while locked'
    ).toEqual([]);
  });

  it('enables those same controls when unlocked', async () => {
    // The counter-case. Without it, "all disabled" would also pass on a surface
    // that rendered no controls at all, or one that disables everything always.
    const locked = (await mountHub(true)).labelled(ACTION_CONTROL);
    const open = (await mountHub(false)).labelled(ACTION_CONTROL);

    expect(open.length).toBe(locked.length);
    expect(open.filter((button) => button.disabled).map((b) => b.textContent)).toEqual([]);
  });

  it('leaves the way out of the lock working', async () => {
    const harness = await mountHub(true);
    for (const button of harness.buttons().filter((b) => !b.disabled)) {
      await act(async () => {
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    }
    // A lock that disabled the settings route would strand the user inside it
    // with no way to reach the thing that lifts it.
    expect(harness.fired.length, 'locked workspace offers no working control').toBeGreaterThan(0);
    expect(harness.fired).toContain('onOpenSettings');
  });

  it('runs no command and approves nothing while locked', async () => {
    const harness = await mountHub(true);
    for (const button of harness.buttons().filter((b) => !b.disabled)) {
      await act(async () => {
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    }
    // Navigation is expected and fine; workspace mutation is not.
    expect(harness.fired.filter((entry) => entry.startsWith('runCommand:'))).toEqual([]);
    expect(harness.fired).not.toContain('onApproveOperatorTrace');
  });
});

describe('keyboard operation', () => {
  it('makes every control a real button rather than a clickable div', async () => {
    const harness = await mountHub(false);
    // A `<div role="button">` needs its own Enter and Space handling, and the
    // usual bug is that it has neither. Native buttons get it from the platform,
    // which is also what makes `disabled` a keyboard guarantee and not a style.
    const fakeButtons = Array.from(harness.container.querySelectorAll('[role="button"]')).filter(
      (el) => el.tagName !== 'BUTTON'
    );
    expect(fakeButtons.map((el) => el.outerHTML.slice(0, 90))).toEqual([]);
  });

  it('focuses a control that is focused programmatically', async () => {
    const harness = await mountHub(false);
    const target = harness.buttons().find((button) => !button.disabled);
    target?.focus();
    // Establishes that focus assertions in this file mean something.
    expect(document.activeElement).toBe(target);
  });

  it('autofocuses nothing that approves', async () => {
    await mountHub(false);
    const active = document.activeElement;
    if (active && active !== document.body) {
      // Landing on the surface with an approving control already focused makes
      // a stray Enter press an approval.
      expect(ACTION_CONTROL.test((active.textContent ?? '').trim())).toBe(false);
    }
  });
});

/**
 * The guard that catches the *next* one.
 *
 * Fixing `Convert` fixes today. This asks the question of every primary action
 * the surface renders, so a feed item added next month that forgets
 * `primaryDisabled` fails here rather than waiting for someone to drive it by
 * hand. It is the difference between finding a bug and closing the class.
 */
describe('every action control is gated, not just the ones already known', () => {
  /**
   * Fixing `Convert` fixes today. This asks the question of every control the
   * surface renders, so a feed item added next month that forgets
   * `primaryDisabled` fails here rather than waiting for someone to drive it by
   * hand. It is the difference between finding a bug and closing the class.
   */
  it('leaves nothing enabled while locked except read-only controls', async () => {
    const harness = await mountHub(true);
    const live = Array.from(
      new Set(
        harness
          .buttons()
          .filter((button) => !button.disabled)
          .map((button) => (button.textContent ?? '').trim())
          .filter((label) => label.length > 0 && !READ_ONLY_CONTROL.test(label))
      )
    );

    // Anything here acts on a locked workspace, or needs a line in
    // READ_ONLY_CONTROL saying why it does not.
    expect(live, 'enabled while locked — gate it, or exempt it deliberately').toEqual([]);
  });

  it('still finds plenty of controls to check', async () => {
    const harness = await mountHub(true);
    // If the surface rendered almost nothing, the assertion above would pass by
    // having nothing to judge.
    expect(harness.buttons().length).toBeGreaterThan(20);
    expect(harness.buttons().filter((b) => b.disabled).length).toBeGreaterThan(10);
  });

  it('read-only export stays available while locked', async () => {
    const harness = await mountHub(true);
    // Deliberate: a user who cannot run commands should still be able to take
    // their own data out. Asserted so it is a decision, not an oversight.
    const exports = harness.labelled(/^\s*Export\s*$/);
    expect(exports.length).toBeGreaterThan(0);
    expect(exports.every((button) => !button.disabled)).toBe(true);
  });
});
