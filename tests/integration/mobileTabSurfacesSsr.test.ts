/**
 * Integration-style checks: each tab surface renders without throw and emits expected landmarks.
 * Uses react-dom/server (no browser, no extra test harness).
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CockpitDailyView } from '../../src/pages/mobile/CockpitDailyView';
import { MobileChatView } from '../../src/pages/mobile/MobileChatView';
import { MobileIntegrationsView } from '../../src/pages/mobile/MobileIntegrationsView';
import { MobileSettingsView } from '../../src/pages/mobile/MobileSettingsView';
import { MobileWorkspaceHubView } from '../../src/pages/mobile/MobileWorkspaceHubView';
import { FirstRunJourneyCard } from '../../src/pages/mobile/FirstRunJourneyCard';
import { AppearanceToggle } from '../../src/pages/mobile/AppearanceToggle';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import {
  initIntelligenceRulesFromRemote,
  resetIntelligenceRulesForTests
} from '../../src/rules/intelligenceRulesRuntime';
import type { LaunchAccessState } from '../../src/shared/account/launchAccess';
import type { ChatMessage } from '../../src/pages/mobile/MobileChatView';
import { cloneDemoSampleData, cloneSeedData } from '../helpers/fixtures';
import {
  createDigitalTwinFromText,
  hydrateWorkspaceFromDigitalTwin
} from '../../src/services/digitalTwin/digitalTwin';

const planLaunchFixture: LaunchAccessState = {
  auth: {
    isAuthenticated: true,
    provider: 'google',
    email: 'operator@fixture.test'
  },
  membership: { status: 'active' }
};

const snapshot = () => buildWorkspaceSnapshot(cloneSeedData());
const noop = () => {};
const asyncNoop = async () => {};

const twinSnapshot = () => {
  const data = cloneSeedData();
  const { twin, resumeArtifact } = createDigitalTwinFromText({
    workspace: data,
    rawText: `Maya Rivera
Senior AI Product Operator | 2020 - Present
Skills
TypeScript, React, Python, NLP, leadership
- Built AI workflow systems for creator operations`,
    sourceType: 'resume',
    reviewOverrides: { displayName: 'Maya Rivera', headline: 'Senior AI Product Operator' }
  });
  return buildWorkspaceSnapshot(
    hydrateWorkspaceFromDigitalTwin({ workspace: data, twin, resumeArtifact }).workspace
  );
};

const approvalSnapshot = () => {
  const data = cloneSeedData();
  data.operatorTraces = {
    entries: [
      {
        id: 'approval-1',
        at: '2026-01-01T12:00:00.000Z',
        source: 'assistant',
        verb: 'draft outreach',
        surface: 'plan',
        route: 'outreach-workspace',
        entityType: 'outreach',
        entityId: 'draft-1',
        details: {
          output: 'Review this outreach before sending.',
          version: 'v2'
        },
        labels: ['external-action', 'human-gated'],
        reviewStatus: 'pending'
      },
      /**
       * A trace that actually finished, so the fixture has both halves.
       *
       * It used to have only the pending one, and that single trace supplied
       * both the approval *and* a receipt — which is precisely the defect: a
       * request awaiting review was rendered as completed work. Now the pending
       * trace is an approval and this one is the receipt, which is what the two
       * groups are for.
       */
      {
        id: 'completed-1',
        at: '2026-01-01T11:00:00.000Z',
        source: 'assistant',
        verb: 'publish weekly digest',
        surface: 'plan',
        route: 'content-workspace',
        entityType: 'content',
        entityId: 'digest-9',
        outcome: 'success',
        details: { output: 'Digest published to the workspace archive.' },
        labels: ['human-gated'],
        reviewStatus: 'approved'
      }
    ]
  };
  return buildWorkspaceSnapshot(data);
};

describe('Mobile tab surfaces (SSR integration)', () => {
  it('Plan hub: renders the unified operational stream', () => {
    const html = renderToString(
      React.createElement(MobileWorkspaceHubView, {
        snapshot: buildWorkspaceSnapshot(cloneDemoSampleData()),
        btnFocus: '',
        commandBusy: false,
        runCommand: noop,
        onOpenToday: noop,
        launchAccess: planLaunchFixture,
        onOpenSettings: noop,
        onOpenIntegrations: noop,
        onOpenCommandPalette: noop,
        firstRunJourneyVisible: true,
        canRunWorkspaceCommands: true,
        workspaceCommandLockReason: null,
        onDownloadPipelineRun: noop,
        onApproveOperatorTrace: asyncNoop
      })
    );
    expect(html).toContain('aria-label="Plan"');
    expect(html).toContain('Operational workspace');
    expect(html).toContain('What needs your attention?');
    expect(html).toContain('Twin Status');
    expect(html).toContain('Pending Approvals');
    expect(html).toContain('Opportunities');
    expect(html).toContain('Active Plans');
    /**
     * The focus-chip row is gone, and these assertions moved with it.
     *
     * Four of its six chips set exactly the same state as a summary tile —
     * "Approvals" the chip and "Pending Approvals" the tile were one control
     * drawn twice — so the header carried eleven controls of which eight were
     * duplicated pairs. The tiles survived because they show the count as well
     * as filtering, and they now toggle back to "all" when pressed again.
     *
     * What replaced the flat feed is asserted instead: named groups, in reading
     * order, so eighteen equal headings became a handful of labelled ones.
     */
    expect(html).toContain('Waiting on you');
    expect(html).toContain('Suggested');
    expect(html).toContain('Nothing here moves until you decide.');
    // Was `toContain('Showing ')` and `toContain('Start here')`. The first
    // pinned the wording of a counter that read "Showing 18 of 18"; the second
    // pinned a card that rendered the first feed item a second time, directly
    // above the group that already lists it. Both are gone, and what they were
    // standing in for — that the feed renders, grouped, with a count — is
    // asserted directly.
    expect(html).toMatch(/\d+ items\./);
    /**
     * The group headings, not the per-row kind labels.
     *
     * These asserted `Active plan` and `Recent receipt`, which were the labels
     * on every row inside "In progress" and "Recently done" respectively — each
     * restating the heading directly above it. Six of the nine labels rendered
     * were redundant that way, and they are now suppressed wherever a group
     * holds a single kind. `Recommended next move` survives because "Suggested"
     * mixes two kinds and the label still tells them apart.
     *
     * What these lines were really asserting is that every kind of work reaches
     * the feed, which is now checked through the groups that carry them.
     */
    expect(html).toContain('In progress');
    /**
     * "Recently done" is absent, and that is the correct rendering.
     *
     * It used to be here because the demo workspace's completed list was made
     * entirely of expert routing readouts — computed during the render and
     * reported as finished work. With those removed the demo has no execution
     * receipts at all, so the group has nothing to show and is not drawn.
     *
     * The group itself is asserted against a workspace that has genuinely
     * completed something, in `snapshotDeterminism` and in the approval case
     * below.
     */
    expect(html).toContain('Recommended next move');
    expect(html).toContain('Your workspace is local-first');
    expect(html).toContain('Details');
    expect(html).toContain('Timeline');
    expect(html).toContain('Approvals');
    expect(html).toContain('Receipts');
    expect(html).toContain('Workflow Plan');
    expect(html).toContain('Outreach Plan');
    expect(html).toContain('Content Calendar');
    /**
     * No longer in the first paint, and that is the point.
     *
     * Each group shows three items and offers the rest behind "Show N more".
     * Before, every item in the feed was rendered at once — 936 words and
     * eighteen equally-weighted headings — which is what made the page unreadable.
     * Asserting that a fourth item in a group is visible would be asserting the
     * thing that was wrong with it.
     *
     * What must hold is that nothing became unreachable, so the disclosure
     * control is asserted instead.
     */
    // React SSR puts `<!-- -->` between adjacent text and expression nodes,
    // so the raw markup reads `Show <!-- -->7<!-- --> more`.
    expect(html).toMatch(/Show (<!-- -->)?\d+(<!-- -->)? more/);
    // 'Approval Flow' is the other item now behind "Show N more", for the same
    // reason as 'Execution Sequence' above. Both remain reachable; neither is in
    // the first paint, which is the entire point of grouping the feed.
    expect(html).toContain('In progress');
    /**
     * "Recently done" is absent, and that is the correct rendering.
     *
     * It used to be here because the demo workspace's completed list was made
     * entirely of expert routing readouts — computed during the render and
     * reported as finished work. With those removed the demo has no execution
     * receipts at all, so the group has nothing to show and is not drawn.
     *
     * The group itself is asserted against a workspace that has genuinely
     * completed something, in `snapshotDeterminism` and in the approval case
     * below.
     */
    expect(html).toContain('Approve');
    expect(html).toContain('Export');
    expect(html).toContain('>Review<');
    expect(html).toContain('Local membership active · unverified');
    expect(html).toContain('operator@fixture.test');
    expect(html).not.toContain('Workstreams');
    expect(html).not.toContain('Command center');
    expect(html).not.toContain('Workspace Health');
  });

  it('Plan hub: setup hint when profile placeholders remain (Getting started checklist dismissed)', () => {
    const html = renderToString(
      React.createElement(MobileWorkspaceHubView, {
        snapshot: buildWorkspaceSnapshot(cloneSeedData()),
        btnFocus: '',
        commandBusy: false,
        runCommand: noop,
        onOpenToday: noop,
        launchAccess: planLaunchFixture,
        onOpenSettings: noop,
        onOpenIntegrations: noop,
        onOpenCommandPalette: noop,
        firstRunJourneyVisible: false,
        canRunWorkspaceCommands: true,
        workspaceCommandLockReason: null,
        onDownloadPipelineRun: noop,
        onApproveOperatorTrace: asyncNoop
      })
    );
    expect(html).toContain('Add your offer, voice, and focus metric');
    expect(html).toContain('Set up');
  });

  it('Plan hub: no setup hint on personalized demo when profile is complete', () => {
    const html = renderToString(
      React.createElement(MobileWorkspaceHubView, {
        snapshot: buildWorkspaceSnapshot(cloneDemoSampleData()),
        btnFocus: '',
        commandBusy: false,
        runCommand: noop,
        onOpenToday: noop,
        launchAccess: planLaunchFixture,
        onOpenSettings: noop,
        onOpenIntegrations: noop,
        onOpenCommandPalette: noop,
        firstRunJourneyVisible: false,
        canRunWorkspaceCommands: true,
        workspaceCommandLockReason: null,
        onDownloadPipelineRun: noop,
        onApproveOperatorTrace: asyncNoop
      })
    );
    expect(html).not.toContain('Add your offer, voice, and focus metric');
  });

  it('Plan hub: twin context and intelligence surfaces render when twin is present', () => {
    const html = renderToString(
      React.createElement(MobileWorkspaceHubView, {
        snapshot: twinSnapshot(),
        btnFocus: '',
        commandBusy: false,
        runCommand: noop,
        onOpenToday: noop,
        launchAccess: planLaunchFixture,
        onOpenSettings: noop,
        onOpenIntegrations: noop,
        onOpenCommandPalette: noop,
        firstRunJourneyVisible: true,
        canRunWorkspaceCommands: true,
        workspaceCommandLockReason: null,
        onDownloadPipelineRun: noop,
        onApproveOperatorTrace: asyncNoop
      })
    );
    expect(html).toContain('What your twin knows');
    expect(html).toContain('Maya Rivera');
    expect(html).toContain('confidence');
    expect(html).toContain('skills');
    expect(html).toContain('Twin intelligence');
  });

  it('Plan hub: renders converted ASK cards in the operational studio', () => {
    const html = renderToString(
      React.createElement(MobileWorkspaceHubView, {
        snapshot: buildWorkspaceSnapshot(cloneDemoSampleData()),
        btnFocus: '',
        commandBusy: false,
        runCommand: noop,
        onOpenToday: noop,
        launchAccess: planLaunchFixture,
        onOpenSettings: noop,
        onOpenIntegrations: noop,
        onOpenCommandPalette: noop,
        firstRunJourneyVisible: true,
        canRunWorkspaceCommands: true,
        workspaceCommandLockReason: null,
        onDownloadPipelineRun: noop,
        onApproveOperatorTrace: asyncNoop,
        convertedOperationalPlans: [
          {
            id: 'ask-plan-test',
            title: 'Converted Execution Plan',
            kind: 'workflow',
            promise: 'Created from ASK.',
            previewCommand: 'ask: preview converted plan',
            approveCommand: 'add note: converted plan',
            editTarget: 'palette',
            status: 'needs-input',
            progress: 15,
            timeline: ['ASK output', 'PLAN preview', 'Human approval', 'Execute in workspace'],
            sourceLabel: 'Converted from ASK',
            exportPayload: { type: 'execution-plan' }
          }
        ]
      })
    );

    expect(html).toContain('Converted Execution Plan');
    expect(html).toContain('Converted from ASK');
    expect(html).toContain('Details');
    expect(html).toContain('Approvals');
  });

  it('Plan hub: human approval queue exposes trust controls for pending outputs', () => {
    const html = renderToString(
      React.createElement(MobileWorkspaceHubView, {
        snapshot: approvalSnapshot(),
        btnFocus: '',
        commandBusy: false,
        runCommand: noop,
        onOpenToday: noop,
        launchAccess: planLaunchFixture,
        onOpenSettings: noop,
        onOpenIntegrations: noop,
        onOpenCommandPalette: noop,
        firstRunJourneyVisible: true,
        canRunWorkspaceCommands: true,
        workspaceCommandLockReason: null,
        onDownloadPipelineRun: noop,
        onApproveOperatorTrace: asyncNoop,
        onRejectOperatorTrace: asyncNoop
      })
    );

    expect(html).toContain('draft outreach');
    expect(html).toContain('Review this outreach before sending.');
    expect(html).toContain('Review');
    expect(html).toContain('Reject');
    expect(html).toContain('Approve');
  });

  it('Plan hub: execution receipts explain action, data, outputs, approvals, and status', () => {
    const html = renderToString(
      React.createElement(MobileWorkspaceHubView, {
        snapshot: approvalSnapshot(),
        btnFocus: '',
        commandBusy: false,
        runCommand: noop,
        onOpenToday: noop,
        launchAccess: planLaunchFixture,
        onOpenSettings: noop,
        onOpenIntegrations: noop,
        onOpenCommandPalette: noop,
        firstRunJourneyVisible: true,
        canRunWorkspaceCommands: true,
        workspaceCommandLockReason: null,
        onDownloadPipelineRun: noop,
        onApproveOperatorTrace: asyncNoop,
        onRejectOperatorTrace: asyncNoop
      })
    );

    /**
     * The approval is in "Waiting on you", and nowhere else.
     *
     * These two lines asserted it also appeared under "Recently done" carrying
     * the words "pending approval" — a request the reader had not yet answered,
     * listed as finished. Both halves of that are now wrong on purpose: pending
     * traces are not receipts, and the state a reader sees is drawn from one
     * small vocabulary rather than from whatever string the producing system
     * used.
     */
    expect(html).toContain('Waiting on you');
    expect(html).toContain('draft outreach');
    expect(html).toContain('Recently done');
    expect(html).toContain('publish weekly digest');
    expect(html).toContain('Explain');
    expect(html).toContain('Export');
  });

  it('ASK: renders a focused Ask My Twin conversation surface', () => {
    const messages: ChatMessage[] = [
      {
        id: 'w',
        role: 'assistant',
        resultKind: 'plain',
        text: 'Talk through positioning, strategy, ideas, and opportunities with your twin.'
      },
      {
        id: 'hidden-workspace-command',
        role: 'assistant',
        resultKind: 'command-result',
        sourceSurface: 'Workspace',
        text: 'Workspace command result should stay out of Ask My Twin.'
      }
    ];
    const html = renderToString(
      React.createElement(MobileChatView, {
        messages,
        loading: false,
        onQuickCommand: noop,
        btnFocus: ''
      })
    );
    expect(html).toContain('aria-label="Ask My Twin conversation"');
    expect(html).toContain('Ask My Twin');
    expect(html).toContain('Twin-grounded reasoning');
    expect(html).toContain('id="assistant-thread"');
    expect(html).toContain('Ask My Twin conversation timeline');
    expect(html).toContain('Save');
    expect(html).toContain('Pin');
    expect(html).toContain('Copy');
    expect(html).toContain('bo-ops-panel');
    expect(html).not.toContain('Try asking');
    expect(html).not.toContain('Think with your twin');
    expect(html).not.toContain('Execution shortcuts');
    expect(html).not.toContain('Operational Intelligence Core recommendation');
    expect(html).not.toContain('Workspace command result should stay out of Ask My Twin.');
    expect(html).not.toContain('Type a command');
  });

  it('ASK: active twin chip renders when a twin exists', () => {
    const html = renderToString(
      React.createElement(MobileChatView, {
        messages: [],
        loading: false,
        onQuickCommand: noop,
        btnFocus: '',
        activeDigitalTwin: twinSnapshot().activeDigitalTwin
      })
    );

    expect(html).toContain('Maya Rivera');
    expect(html).toContain('confidence');
    expect(html).toContain('Ask your twin anything');
    expect(html).not.toContain('Twin Context Mode');
    expect(html).not.toContain('Actionable outputs');
  });

  it('ASK: hosted outputs expose Convert to Plan handoff actions', () => {
    const messages: ChatMessage[] = [
      {
        id: 'user-1',
        role: 'user',
        text: 'Draft a plan for this.'
      },
      {
        id: 'ask-1',
        role: 'assistant',
        resultKind: 'ask-result',
        ok: true,
        text: 'Here is a strategic output that should become an operational plan.'
      }
    ];
    const html = renderToString(
      React.createElement(MobileChatView, {
        messages,
        loading: false,
        onQuickCommand: noop,
        btnFocus: '',
        onConvertAskToPlan: noop
      })
    );

    expect(html).toContain('Twin response');
    expect(html).toContain('Convert to Plan');
    expect(html).toContain('Save');
    expect(html).toContain('Pin');
    expect(html).not.toContain('Action queue');
    expect(html).not.toContain('Approval Prompt Card');
    expect(html).not.toContain('Interactive ASK cards');
  });

  it('Plan hub: active twin context influences operational planning', () => {
    const html = renderToString(
      React.createElement(MobileWorkspaceHubView, {
        snapshot: twinSnapshot(),
        btnFocus: '',
        commandBusy: false,
        runCommand: noop,
        onOpenToday: noop,
        launchAccess: planLaunchFixture,
        onOpenSettings: noop,
        onOpenIntegrations: noop,
        onOpenCommandPalette: noop,
        firstRunJourneyVisible: true,
        canRunWorkspaceCommands: true,
        workspaceCommandLockReason: null,
        onDownloadPipelineRun: noop,
        onApproveOperatorTrace: asyncNoop
      })
    );

    expect(html).toContain('Maya Rivera is guiding PLAN');
    expect(html).toContain('Maya Rivera');
    expect(html).toContain('Review gaps');
    expect(html).toContain('Outreach Plan');
  });

  it('Getting started card: Plan onboarding landmarks', () => {
    const html = renderToString(
      React.createElement(FirstRunJourneyCard, {
        btnFocus: '',
        onDismiss: noop,
        onTryCommand: noop,
        onOpenAsk: noop,
        onOpenSettings: noop,
        onOpenHelp: noop
      })
    );
    expect(html).toContain('aria-label="Start here — first session"');
    expect(html).toContain('Your AI-native brand operating system');
    expect(html).toContain('Create a persistent Digital Twin');
    expect(html).toContain('experts route, plans execute, verified results compound');
    expect(html).toContain('Create twin');
    expect(html).toContain('Ask twin');
    expect(html).toContain('Dismiss getting started');
  });

  it('AppearanceToggle renders sun/moon segment for shell header', () => {
    const html = renderToString(
      React.createElement(AppearanceToggle, {
        activeTheme: 'dark',
        onChange: noop,
        btnFocus: ''
      })
    );
    expect(html).toContain('bo-theme-seg');
    expect(html).toContain('Use light appearance');
    expect(html).toContain('Use dark appearance');
  });

  it('Today (Cockpit): header, workstream bar, at-a-glance metrics, and workstream section ids', () => {
    const html = renderToString(
      React.createElement(CockpitDailyView, {
        snapshot: snapshot(),
        btnFocus: '',
        runCommand: noop,
        primeChat: noop,
        onOpenInAppSettings: noop,
        activeWorkstream: 'today',
        onSelectWorkstream: noop
      })
    );
    expect(html).toContain('aria-label="Today"');
    // The visible header is just "Today" now; the long form survives as an sr-only fallback.
    expect(html).toContain(
      'Today — twin-grounded daily operating surface with focus board, predictions, and workstreams'
    );
    expect(html).toContain('Work areas');
    expect(html).toContain('>Do today<');
    expect(html).toContain('>Urgent<');
    expect(html).toContain('>Momentum<');
    expect(html).toContain('>BrandOps pulse<');
    expect(html).toContain('Pulse metric instruments');
    expect(html).toContain('Publish queue');
    expect(html).toContain('Sync hub');
    expect(html).toContain('bo-metric-tile');
    expect(html).toContain('bo-pill-nav');
    expect(html).toContain('id="cockpit-today"');
    expect(html).toContain('id="cockpit-pipeline"');
    expect(html).toContain('id="cockpit-brand"');
    expect(html).toContain('id="cockpit-connections"');
    expect(html).toContain('role="group"');
    expect(html).toContain('Chronological mix');
    expect(html).toContain('Full mixed queue on Plan');
    expect(html).toContain('Today workstream Chat starters');
    expect(html).toContain('Pipeline workstream Chat starters');
    expect(html).toContain('Brand and content Chat starters');
    expect(html).toContain('Connections workstream Chat starters');
  });

  it('Today (demo): shows scheduler, notes, and contacts peeks when workspace has data', () => {
    const html = renderToString(
      React.createElement(CockpitDailyView, {
        snapshot: buildWorkspaceSnapshot(cloneDemoSampleData()),
        btnFocus: '',
        runCommand: noop,
        primeChat: noop,
        onOpenInAppSettings: noop,
        activeWorkstream: 'today',
        onSelectWorkstream: noop
      })
    );
    expect(html).toContain('Upcoming scheduler tasks');
    expect(html).toContain('Recent notes');
    expect(html).toContain('Contacts (recent touch)');
    expect(html).toContain('Outreach templates');
    expect(html).toContain('Technical Partnership Intro');
    expect(html).toContain('Outreach history');
    expect(html).toContain('Samira Patel');
    expect(html).toContain('Companies (active)');
    expect(html).toContain('Northstar Robotics');
    expect(html).toContain('Brand vault (read-only)');
    expect(html).toContain('Connections workstream Chat starters');
    expect(html).toContain('Add note');
  });

  it('Integrations: sources, registered list, provider status, quick add', () => {
    const html = renderToString(
      React.createElement(MobileIntegrationsView, {
        snapshot: snapshot(),
        btnFocus: '',
        runCommand: noop
      })
    );
    expect(html).toContain('aria-label="Integrations"');
    expect(html).toContain('Google, GitHub, and LinkedIn preference rows from Settings');
    expect(html).toContain('Sources');
    expect(html).toContain('Connect tools and data');
    expect(html).toContain('Registered sources');
    expect(html).toContain('Open Integrations hub');
    expect(html).toContain('Sync hub');
    expect(html).toContain('How the registry works');
    expect(html).toContain('Add via Chat');
    expect(html).toContain('CRM &amp; pipeline');
    expect(html).toContain('HubSpot');
    expect(html).toContain('preset shortcuts');
    expect(html).toContain('Captured artifacts');
    expect(html).toContain('Servers');
  });

  it('Integrations (demo): external sync and hub activity when present', () => {
    const html = renderToString(
      React.createElement(MobileIntegrationsView, {
        snapshot: buildWorkspaceSnapshot(cloneDemoSampleData()),
        btnFocus: '',
        runCommand: noop
      })
    );
    expect(html).toContain('External sync');
    expect(html).toContain('google-calendar');
    expect(html).toContain('Hub activity');
    expect(html).toContain('Cockpit initialized');
  });

  it('Integrations: lists hub rows when workspace has sources', () => {
    const html = renderToString(
      React.createElement(MobileIntegrationsView, {
        snapshot: buildWorkspaceSnapshot(cloneDemoSampleData()),
        btnFocus: '',
        runCommand: noop
      })
    );
    expect(html).toContain('Check source');
    expect(html).toContain('Saved locally');
    expect(html).not.toContain('No sources in this workspace yet');
  });

  it('Integrations on integrations host: hides packaged page link', () => {
    const html = renderToString(
      React.createElement(MobileIntegrationsView, {
        snapshot: snapshot(),
        btnFocus: '',
        runCommand: noop,
        documentSurface: 'integrations'
      })
    );
    expect(html).not.toContain('Open integrations page');
    expect(html).toContain('Registered sources');
  });

  it('buildWorkspaceSnapshot exposes integrationHubSources aligned with hub', () => {
    const empty = buildWorkspaceSnapshot(cloneSeedData());
    expect(empty.integrationHubSources).toEqual([]);
    const demo = buildWorkspaceSnapshot(cloneDemoSampleData());
    expect(demo.integrationHubSources.length).toBe(demo.integrationSources);
    expect(demo.integrationHubSources[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      kind: expect.any(String),
      status: expect.any(String)
    });
  });

  it('buildWorkspaceSnapshot exposes cockpit peek rows for Today and Integrations tabs', () => {
    const demo = buildWorkspaceSnapshot(cloneDemoSampleData());
    expect(Array.isArray(demo.cockpitOpportunityPeek)).toBe(true);
    expect(Array.isArray(demo.cockpitContentPeek)).toBe(true);
    expect(Array.isArray(demo.cockpitPublishingPeek)).toBe(true);
    expect(Array.isArray(demo.integrationArtifactsPeek)).toBe(true);
    expect(Array.isArray(demo.sshTargetsPeek)).toBe(true);
    expect(demo.cockpitSchedulerTaskPeek.length).toBeGreaterThan(0);
    expect(demo.cockpitRecentNotesPeek.length).toBeGreaterThan(0);
    expect(demo.cockpitContactsPeek.length).toBeGreaterThan(0);
    expect(demo.externalSyncLinksPeek.length).toBeGreaterThan(0);
    expect(demo.integrationLiveFeedPeek.length).toBeGreaterThan(0);
    expect(demo.seedReadout.source).toBe('demo-sample');
    expect(demo.cockpitOutreachTemplatePeek.length).toBeGreaterThan(0);
    expect(demo.cockpitOutreachHistoryPeek.length).toBeGreaterThan(0);
    expect(demo.cockpitCompanyPeek.length).toBeGreaterThan(0);
    expect(
      demo.cockpitBrandVaultReadout.filledListFieldsCount > 0 ||
        demo.cockpitBrandVaultReadout.positioningPreview.length > 0
    ).toBe(true);
    expect(demo.settingsMessagingVaultPeek.length).toBeGreaterThan(0);
  });

  it('Settings: unified workspace surface, data/session, advanced block (mobile host shows new-tab CTA)', () => {
    const html = renderToString(
      React.createElement(MobileSettingsView, {
        snapshot: snapshot(),
        btnFocus: '',
        runCommand: noop,
        applySettingsConfigure: asyncNoop,
        applyBusy: false,
        commandBusy: false,
        onRequestClearChat: noop,
        onExportWorkspace: asyncNoop,
        onExportOperatorTraces: asyncNoop,
        onImportWorkspace: asyncNoop,
        onRequestResetWorkspace: noop,
        onOperatorTraceCollectionChange: noop,
        documentSurface: 'mobile'
      })
    );
    expect(html).toContain('aria-label="Settings"');
    expect(html).toContain(
      'You and this workspace: account, behavior, and data safety. For provider wiring and sources,'
    );
    expect(html).toContain('Workspace');
    expect(html).toContain('Edit');
    expect(html).toContain('Profile (saved)');
    expect(html).toContain('Workspace model (read-only)');
    expect(html).toContain('Unified workspace');
    expect(html).toContain('Assistant and preferences');
    expect(html).toContain('Preferences (edit workspace)');
    expect(html).not.toContain('Run presets in Chat');
    expect(html).not.toContain('Workspace templates');
    expect(html).toContain('settings-data-tier-a');
    expect(html).toContain('Export workspace JSON');
    expect(html).toContain('Export operator traces');
    expect(html).toContain('Record operator traces locally');
    expect(html).toContain('Assistant');
    expect(html).toContain('Hosted AI');
    expect(html).toContain('Inference base URL');
    expect(html).toContain('Webhook receiver trust');
    expect(html).toContain('Create AI digital twin');
    expect(html).toContain('PDF/DOCX parsing is not bundled yet');
    expect(html).toContain('Generate digital twin');
    expect(html).toContain('Diagnostics');
    expect(html).toContain('Integrations hub');
    expect(html).toContain('Open Integrations hub in a new tab');
    expect(html).toContain('Dataset lineage');
    expect(html).toContain('production-empty');
    expect(html).toContain('Intelligence rules (effective)');
    expect(html).toContain('Scoring profile used for Today digests.');
    expect(html).toContain('Sample coefficients');
    expect(html).toContain('Messaging vault');
    expect(html).toContain('No messaging vault entries in this workspace.');
    expect(html).toContain('Capability map');
    expect(html).toContain('Expand capability index');
  });

  it('Settings: Twin Dashboard renders active twin, action studio, export, and delete controls', () => {
    const html = renderToString(
      React.createElement(MobileSettingsView, {
        snapshot: twinSnapshot(),
        btnFocus: '',
        runCommand: noop,
        applySettingsConfigure: asyncNoop,
        applyBusy: false,
        commandBusy: false,
        onRequestClearChat: noop,
        onExportWorkspace: asyncNoop,
        onExportOperatorTraces: asyncNoop,
        onImportWorkspace: asyncNoop,
        onRequestResetWorkspace: noop,
        onOperatorTraceCollectionChange: noop,
        documentSurface: 'mobile'
      })
    );

    expect(html).toContain('Twin');
    expect(html).toContain('Maya Rivera');
    expect(html).toContain('Twin Action Studio');
    expect(html).toContain('Captured into BrandOps');
    expect(html).toContain('Export twin data');
    expect(html).toContain('Delete twin');
    expect(html).toContain('Improve Twin Profile');
  });

  it('Settings: intelligence readout reflects init when awaited before snapshot', async () => {
    resetIntelligenceRulesForTests();
    await initIntelligenceRulesFromRemote();
    const snap = buildWorkspaceSnapshot(cloneSeedData());
    expect(snap.intelligenceRulesReadout.initRan).toBe(true);
    const html = renderToString(
      React.createElement(MobileSettingsView, {
        snapshot: snap,
        btnFocus: '',
        runCommand: noop,
        applySettingsConfigure: asyncNoop,
        applyBusy: false,
        commandBusy: false,
        onRequestClearChat: noop,
        onExportWorkspace: asyncNoop,
        onExportOperatorTraces: asyncNoop,
        onImportWorkspace: asyncNoop,
        onRequestResetWorkspace: noop,
        onOperatorTraceCollectionChange: noop,
        documentSurface: 'mobile'
      })
    );
    expect(html).toContain('Embedded defaults');
    expect(html).toContain(String(snap.intelligenceRulesReadout.schemaVersion));
  });

  it('Settings (demo): messaging vault lists entries', () => {
    const html = renderToString(
      React.createElement(MobileSettingsView, {
        snapshot: buildWorkspaceSnapshot(cloneDemoSampleData()),
        btnFocus: '',
        runCommand: noop,
        applySettingsConfigure: asyncNoop,
        applyBusy: false,
        commandBusy: false,
        onRequestClearChat: noop,
        onExportWorkspace: asyncNoop,
        onExportOperatorTraces: asyncNoop,
        onImportWorkspace: asyncNoop,
        onRequestResetWorkspace: noop,
        onOperatorTraceCollectionChange: noop,
        documentSurface: 'mobile'
      })
    );
    expect(html).toContain('Core positioning');
    expect(html).toContain('Brand narrative');
  });

  it('Settings on integrations.html host: in-page copy, no duplicate new-tab button', () => {
    const html = renderToString(
      React.createElement(MobileSettingsView, {
        snapshot: snapshot(),
        btnFocus: '',
        runCommand: noop,
        applySettingsConfigure: asyncNoop,
        applyBusy: false,
        commandBusy: false,
        onRequestClearChat: noop,
        onExportWorkspace: asyncNoop,
        onExportOperatorTraces: asyncNoop,
        onImportWorkspace: asyncNoop,
        onRequestResetWorkspace: noop,
        onOperatorTraceCollectionChange: noop,
        documentSurface: 'integrations'
      })
    );
    expect(html).toContain('same interface as');
    expect(html).not.toContain('Open integrations page in a new tab');
  });
});
