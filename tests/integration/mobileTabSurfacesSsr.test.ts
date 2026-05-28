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
          output: 'Preview this outreach before sending.',
          version: 'v2'
        },
        labels: ['external-action', 'human-gated'],
        reviewStatus: 'pending'
      }
    ]
  };
  return buildWorkspaceSnapshot(data);
};

describe('Mobile tab surfaces (SSR integration)', () => {
  it('Plan hub: destinations, jump links, Pulse, Today snapshot, queue landmarks', () => {
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
    expect(html).toContain('id="plan-pulse"');
    expect(html).toContain('id="plan-today"');
    expect(html).toContain('id="plan-queue"');
    expect(html).toContain('>Pulse<');
    expect(html).toContain(
      'Live workspace counters — publishing pipeline, cadence, captures, and sync hub — queue below is soonest-first, not a feed.'
    );
    expect(html).toContain('Soonest queue');
    expect(html).toContain('bo-plan-destination-grid');
    expect(html).toContain('aria-label="Plan destinations"');
    expect(html).toContain('Jump within Plan');
    expect(html).toContain('id="plan-actions"');
    expect(html).toContain('Operational execution layer');
    expect(html).toContain('Turn ideas into executable plans');
    expect(html).toContain('PLAN / OPERATE');
    expect(html).toContain('Your AI operating loop');
    expect(html).toContain('Your AI digital twin understands your profession');
    expect(html).toContain('OPERATE');
    expect(html).toContain('id="plan-operational-timeline"');
    expect(html).toContain('Operational command center');
    expect(html).toContain('Cross-platform operational timeline');
    expect(html).toContain('What AI did');
    expect(html).toContain('id="plan-human-approval-queue"');
    expect(html).toContain('Human Approval Queue');
    expect(html).toContain('Trust gate before execution');
    expect(html).toContain('Nothing external executes automatically');
    expect(html).toContain('id="plan-execution-receipts"');
    expect(html).toContain('Execution receipts');
    expect(html).toContain('What happened, why, and what data was used');
    expect(html).toContain('Receipts');
    expect(html).toContain('id="plan-human-trust-layer"');
    expect(html).toContain('Human Trust Layer');
    expect(html).toContain('Safe, controlled, transparent execution');
    expect(html).toContain('Generated drafts');
    expect(html).toContain('Approvals');
    expect(html).toContain('Sent actions');
    expect(html).toContain('Scheduled workflows');
    expect(html).toContain('Platform actions');
    expect(html).toContain('AI recommendations');
    expect(html).toContain('Completed operations');
    expect(html).toContain('Ops timeline');
    expect(html).toContain('Approvals');
    expect(html).toContain('Workflow Plan');
    expect(html).toContain('Outreach Plan');
    expect(html).toContain('Content Calendar');
    expect(html).toContain('Execution Sequence');
    expect(html).toContain('Approval Flow');
    expect(html).toContain('Preview');
    expect(html).toContain('Approve');
    expect(html).toContain('Edit');
    expect(html).toContain('Retry');
    expect(html).toContain('Export plan JSON');
    expect(html).toContain('Execution picks');
    expect(html).toContain('Sync embeddings');
    expect(html).toContain('Execution and governance');
    expect(html).toContain('id="plan-exec-insights"');
    expect(html).toContain('Today snapshot');
    expect(html).toContain('Open full Today');
    expect(html).toContain('Plan strip');
    expect(html).toContain('id="plan-profile-summary"');
    expect(html).toContain('Workspace profile');
    expect(html).toContain('Edit profile');
    expect(html).toContain('Resume-to-Digital-Twin');
    expect(html).toContain('Upload your resume. Build your AI twin.');
    expect(html).toContain('PDF/DOCX parsing is shown');
    expect(html).toContain('Primary offer');
    expect(html).toContain('Voice guide');
    expect(html).toContain('Focus metric');
    expect(html).toContain('>Today<');
    expect(html).toContain('>Pipeline<');
    expect(html).toContain('<table');
    expect(html).toContain('>Run<');
    expect(html).toContain('bo-icon-chip');
    expect(html).toContain('Account &amp; billing');
    expect(html).toContain('Membership active');
    expect(html).toContain('operator@fixture.test');
    expect(html).not.toContain('Workspace setup hint');
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
    expect(html).toContain('Workspace setup hint');
    expect(html).toContain('⌘K palette');
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
    expect(html).not.toContain('Workspace setup hint');
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
    expect(html).toContain('ASK output');
    expect(html).toContain('PLAN preview');
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
    expect(html).toContain('Output preview');
    expect(html).toContain('Preview this outreach before sending.');
    expect(html).toContain('external-action');
    expect(html).toContain('Preview');
    expect(html).toContain('Edit');
    expect(html).toContain('Reject');
    expect(html).toContain('Regenerate');
    expect(html).toContain('Compare versions');
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

    expect(html).toContain('Execution receipts');
    expect(html).toContain('Every PLAN execution gets a readable receipt');
    expect(html).toContain('Source facts used');
    expect(html).toContain('Generated outputs');
    expect(html).toContain('Approvals');
    expect(html).toContain('Warnings / errors');
    expect(html).toContain('Pending human approval');
    expect(html).toContain('Preview receipt');
    expect(html).toContain('Export receipt JSON');
  });

  it('ASK: intelligence layer, prompt categories, execution shortcuts, and recent commands', () => {
    const messages: ChatMessage[] = [
      {
        id: 'w',
        role: 'assistant',
        resultKind: 'plain',
        text: 'Type a command (try pipeline health) or press ⌘K / Ctrl+K. Workspace: instruments + queue. Today: full lanes.'
      }
    ];
    const html = renderToString(
      React.createElement(MobileChatView, {
        messages,
        loading: false,
        commandHistory: ['pipeline health'],
        onQuickCommand: noop,
        copilotWorkerRegistry: snapshot().copilotWorkerRegistry,
        onSelectCopilotWorker: noop,
        onClearCommandHistory: noop,
        btnFocus: '',
        onOpenCommandPalette: noop,
        onOpenResumeGrounding: noop
      })
    );
    expect(html).toContain('aria-label="ASK intelligence layer"');
    expect(html).toContain('ASK');
    expect(html).toContain('Ask your AI digital twin');
    expect(html).toContain('profession identity');
    expect(html).toContain('PLAN and OPERATE');
    expect(html).toContain('Strategist mode');
    expect(html).toContain('Suggested prompts');
    expect(html).toContain('Brainstorm');
    expect(html).toContain('Resume/profile');
    expect(html).toContain('Opportunity analysis');
    expect(html).toContain('Workflow reasoning');
    expect(html).toContain('Execution shortcuts');
    expect(html).toContain('Connect Notion');
    expect(html).toContain('Check pipeline');
    expect(html).toContain('id="assistant-copilot"');
    expect(html).toContain('id="assistant-commands"');
    expect(html).toContain('id="assistant-thread"');
    expect(html).toContain('Recent');
    expect(html).toContain('pipeline health');
    expect(html).toContain('bo-assistant-hero');
    expect(html).toContain('Build or improve your AI twin');
  });

  it('ASK: active twin memory and guided outputs render when a twin exists', () => {
    const html = renderToString(
      React.createElement(MobileChatView, {
        messages: [],
        loading: false,
        commandHistory: [],
        onQuickCommand: noop,
        copilotWorkerRegistry: snapshot().copilotWorkerRegistry,
        onSelectCopilotWorker: noop,
        onClearCommandHistory: noop,
        btnFocus: '',
        onOpenCommandPalette: noop,
        activeDigitalTwin: twinSnapshot().activeDigitalTwin,
        onTwinAction: noop
      })
    );

    expect(html).toContain('Active twin:');
    expect(html).toContain('Maya Rivera');
    expect(html).toContain('Twin Context Mode');
    expect(html).toContain('Twin memory preview');
    expect(html).toContain('Verified data usage');
    expect(html).toContain('Memory usage');
    expect(html).toContain('Clarification guardrail');
    expect(html).toContain('Twin influence');
    expect(html).toContain('Actionable outputs');
    expect(html).toContain('Safe output rule');
  });

  it('ASK: hosted outputs expose Convert to Plan handoff actions', () => {
    const messages: ChatMessage[] = [
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
        commandHistory: [],
        onQuickCommand: noop,
        copilotWorkerRegistry: snapshot().copilotWorkerRegistry,
        onSelectCopilotWorker: noop,
        onClearCommandHistory: noop,
        btnFocus: '',
        onOpenCommandPalette: noop,
        onConvertAskToPlan: noop
      })
    );

    expect(html).toContain('Convert ASK output to PLAN');
    expect(html).toContain('Ask → Plan → Approve → Execute');
    expect(html).toContain('Convert to Plan');
    expect(html).toContain('Action queue');
    expect(html).toContain('Content schedule');
    expect(html).toContain('Outreach draft');
    expect(html).toContain('Follow-ups');
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

    expect(html).toContain('PLAN active twin context');
    expect(html).toContain('Active twin for PLAN:');
    expect(html).toContain('Maya Rivera');
    expect(html).toContain('Verified data usage');
    expect(html).toContain('Memory usage');
    expect(html).toContain('Twin-aware plan');
    expect(html).toContain('voice, positioning, suggestions, workflows');
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
    expect(html).toContain('ASK. PLAN. OPERATE.');
    expect(html).toContain('Your AI digital twin understands your profession');
    expect(html).toContain('not another chatbot');
    expect(html).toContain('connects platform context');
    expect(html).toContain('Create digital twin');
    expect(html).toContain('ASK your twin');
    expect(html).toContain('Convert ideas into PLANs');
    expect(html).toContain('OPERATE with control');
    expect(html).toContain('Track operational execution');
    expect(html).toContain('Review approval queue');
    expect(html).toContain('View receipts');
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
    expect(html).toContain('Today — plan and work');
    expect(html).toContain('Work areas');
    expect(html).toContain('>Do today<');
    expect(html).toContain('>Urgent<');
    expect(html).toContain('>Momentum<');
    expect(html).toContain('>Pulse<');
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
    expect(html).toContain('Review in Chat');
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
    expect(html).toContain('Open integrations page');
    expect(html).toContain('Sync hub');
    expect(html).toContain('How the registry works');
    expect(html).toContain('Add via Chat');
    expect(html).toContain('CRM &amp; pipeline');
    expect(html).toContain('HubSpot');
    expect(html).toContain('preset shortcuts');
    expect(html).toContain('Captured artifacts');
    expect(html).toContain('SSH targets');
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
    expect(html).toContain('Review in Chat');
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
    expect(html).toContain('Operator twin — résumé ingest (hosted Ask)');
    expect(html).toContain('PDF/DOCX parsing is not bundled yet');
    expect(html).toContain('Generate Digital Twin');
    expect(html).toContain('Diagnostics');
    expect(html).toContain('Extension shell');
    expect(html).toContain('Open integrations page in a new tab');
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

    expect(html).toContain('Twin Dashboard');
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
    expect(html).toContain('same shell as');
    expect(html).not.toContain('Open integrations page in a new tab');
  });
});
