import { describe, expect, it } from 'vitest';
import { PAGE, QUERY, buildMobileCockpitUrl, buildMobileShellUrl } from '../../src/shared/navigation/extensionLinks';
import {
  hrefCockpitConnections,
  hrefDashboardKnowledgeOverlay,
  hrefExtensionIntegrationsPage,
  hrefHelpPage,
  hrefPrimaryAppChat,
  hrefPrimaryAppDefault,
  hrefPrimaryAppIntegrationsTab,
  hrefPrimaryAppPipeline,
  hrefPrimaryAppPulse,
  hrefPrimaryAppSettingsTab,
  hrefPrimaryAppToday
} from '../../src/shared/navigation/navigationIntents';
import { resolveExtensionUrl } from '../../src/shared/navigation/extensionRuntime';

/** Same resolution as in-app, without `chrome` (dev). */
const r = (spec: string) => resolveExtensionUrl(spec);

describe('navigationIntents', () => {
  it('resolves primary app to mobile.html and Chat tab to section=chat', () => {
    expect(hrefPrimaryAppDefault()).toBe(r(PAGE.mobile));
    expect(hrefPrimaryAppChat()).toBe(r(buildMobileShellUrl({ tab: 'chat' })));
    expect(hrefPrimaryAppSettingsTab()).toBe(r(buildMobileShellUrl({ tab: 'settings' })));
    expect(hrefPrimaryAppToday()).toBe(r(buildMobileCockpitUrl({ section: 'today' })));
    expect(hrefPrimaryAppPipeline()).toBe(r(buildMobileCockpitUrl({ section: 'pipeline' })));
    expect(hrefPrimaryAppPulse()).toBe(r(buildMobileShellUrl({ tab: 'pulse' })));
    expect(hrefPrimaryAppIntegrationsTab()).toBe(r(buildMobileShellUrl({ tab: 'integrations' })));
  });

  it('resolves Help page and topic query', () => {
    expect(hrefHelpPage()).toBe(r(`${PAGE.help}`));
    const withTopic = hrefHelpPage('surfaces');
    expect(withTopic).toContain(QUERY.helpTopic);
    expect(withTopic).toContain('surfaces');
  });

  it('resolves dashboard knowledge overlay and integrations hub vs in-app tab', () => {
    expect(hrefDashboardKnowledgeOverlay()).toContain(PAGE.help);
    expect(hrefExtensionIntegrationsPage()).toBe(r(PAGE.integrations));
    expect(hrefCockpitConnections()).toBe(hrefExtensionIntegrationsPage());
  });
});
