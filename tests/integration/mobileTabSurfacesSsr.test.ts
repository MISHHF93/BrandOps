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
import type { MobileChatShellDigest } from '../../src/pages/mobile/MobileChatView';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import type { ChatMessage } from '../../src/pages/mobile/MobileChatView';
import { cloneDemoSampleData, cloneSeedData } from '../helpers/fixtures';

const snapshot = () => buildWorkspaceSnapshot(cloneSeedData());
const noop = () => {};
const asyncNoop = async () => {};

const chatDigest = (): MobileChatShellDigest => {
  const s = snapshot();
  return {
    notes: s.notes,
    publishingQueue: s.publishingQueue,
    activeOpportunities: s.activeOpportunities,
    weightedPipelineUsd: s.pipelineProjection.weightedOpenValueUsd,
    pipelineOpenDeals: s.pipelineProjection.activeDealCount
  };
};

describe('Mobile tab surfaces (SSR integration)', () => {
  it('Chat: header, thread, collapsible starters, optional recent commands', () => {
    const messages: ChatMessage[] = [
      { id: 'w', role: 'assistant', resultKind: 'plain', text: 'Agent ready — type a command below or expand Command starters.' }
    ];
    const html = renderToString(
      React.createElement(MobileChatView, {
        messages,
        loading: false,
        commandHistory: ['pipeline health'],
        onQuickCommand: noop,
        onClearCommandHistory: noop,
        btnFocus: '',
        shellDigest: chatDigest(),
        onNavigateTab: noop
      })
    );
    expect(html).toContain('aria-label="Chat"');
    expect(html).toContain('Workspace snapshot');
    expect(html).toContain('Command starters');
    expect(html).toContain('Today &amp; capture');
    expect(html).toContain('Pipeline &amp; outreach');
    expect(html).toContain('Recent commands');
    expect(html).toContain('pipeline health');
    expect(html).toContain('details');
  });

  it('Today (Cockpit): header, workstream bar, at-a-glance metrics, and workstream section ids', () => {
    const html = renderToString(
      React.createElement(CockpitDailyView, {
        snapshot: snapshot(),
        btnFocus: '',
        runCommand: noop,
        goToChat: noop,
        primeChat: noop,
        onOpenInAppSettings: noop,
        activeWorkstream: 'today',
        onSelectWorkstream: noop
      })
    );
    expect(html).toContain('aria-label="Today"');
    expect(html).toContain('Today — cockpit');
    expect(html).toContain('Work areas');
    expect(html).toContain('At a glance');
    expect(html).toContain('Queue');
    expect(html).toContain('OAuth');
    expect(html).toContain('id="cockpit-today"');
    expect(html).toContain('id="cockpit-pipeline"');
    expect(html).toContain('id="cockpit-brand"');
    expect(html).toContain('id="cockpit-connections"');
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
    expect(html).toContain('Integrations — hub');
    expect(html).toContain('Sources');
    expect(html).toContain('Connections');
    expect(html).toContain('Registered sources');
    expect(html).toContain('Open packaged integrations page');
    expect(html).toContain('Provider status');
    expect(html).toContain('Quick add');
    expect(html).toContain('Add connection');
    expect(html).toContain('Synced artifacts');
    expect(html).toContain('SSH targets');
  });

  it('Integrations: lists hub rows when workspace has sources', () => {
    const html = renderToString(
      React.createElement(MobileIntegrationsView, {
        snapshot: buildWorkspaceSnapshot(cloneDemoSampleData()),
        btnFocus: '',
        runCommand: noop
      })
    );
    expect(html).toContain('Log note in Chat');
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
    expect(html).not.toContain('Open packaged integrations page');
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
  });

  it('Settings: preferences panel, presets, session, extension block (mobile host shows new-tab CTA)', () => {
    const html = renderToString(
      React.createElement(MobileSettingsView, {
        snapshot: snapshot(),
        btnFocus: '',
        runCommand: noop,
        applySettingsConfigure: asyncNoop,
        applyBusy: false,
        onRequestClearChat: noop,
        onExportWorkspace: asyncNoop,
        onImportWorkspace: asyncNoop,
        onRequestResetWorkspace: noop,
        documentSurface: 'mobile'
      })
    );
    expect(html).toContain('aria-label="Settings"');
    expect(html).toContain('Settings — trust');
    expect(html).toContain('Workspace model (read-only)');
    expect(html).toContain('Preferences');
    expect(html).toContain('One-tap configure presets');
    expect(html).toContain('Session');
    expect(html).toContain('Workspace data');
    expect(html).toContain('Export workspace JSON');
    expect(html).toContain('Extension shell');
    expect(html).toContain('Open integrations page in a new tab');
  });

  it('Settings on integrations.html host: in-page copy, no duplicate new-tab button', () => {
    const html = renderToString(
      React.createElement(MobileSettingsView, {
        snapshot: snapshot(),
        btnFocus: '',
        runCommand: noop,
        applySettingsConfigure: asyncNoop,
        applyBusy: false,
        onRequestClearChat: noop,
        onExportWorkspace: asyncNoop,
        onImportWorkspace: asyncNoop,
        onRequestResetWorkspace: noop,
        documentSurface: 'integrations'
      })
    );
    expect(html).toContain('options_ui');
    expect(html).not.toContain('Open integrations page in a new tab');
  });
});
