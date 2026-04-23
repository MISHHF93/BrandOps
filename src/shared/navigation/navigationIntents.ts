/**
 * User-facing navigation built from {@link extensionLinks} + {@link resolveExtensionUrl}.
 * Use this for link `href`s so "where am I going" maps to one place (primary app = `mobile.html`).
 */
import {
  buildHelpUrl,
  buildMobileCockpitUrl,
  buildMobileShellUrl,
  buildWelcomeSignInUrl,
  buildWelcomeSignUpUrl,
  PAGE
} from './extensionLinks';
import { resolveExtensionUrl } from './extensionRuntime';

const r = (spec: string) => resolveExtensionUrl(spec);

/** Same destination as [index.html](index.html) redirect — primary `MobileApp` document. */
export function hrefPrimaryAppDefault(): string {
  return r(PAGE.mobile);
}

/** Chat tab on the primary app; replaces `dashboard.html` for "main workspace" entry. */
export function hrefPrimaryAppChat(): string {
  return r(buildMobileShellUrl({ tab: 'chat' }));
}

export function hrefPrimaryAppPulse(): string {
  return r(buildMobileShellUrl({ tab: 'pulse' }));
}

/** Today tab with cockpit default scroll (`?section=today`). */
export function hrefPrimaryAppToday(): string {
  return r(buildMobileCockpitUrl({ section: 'today' }));
}

/** Pipeline workstream deep link on primary app (`?section=pipeline`). */
export function hrefPrimaryAppPipeline(): string {
  return r(buildMobileCockpitUrl({ section: 'pipeline' }));
}

export function hrefPrimaryAppSettingsTab(): string {
  return r(buildMobileShellUrl({ tab: 'settings' }));
}

/** Integrations tab on `mobile.html` (`?section=integrations`) — same shell as Chat/Pulse. */
export function hrefPrimaryAppIntegrationsTab(): string {
  return r(buildMobileShellUrl({ tab: 'integrations' }));
}

export function hrefSignIn(): string {
  return r(buildWelcomeSignInUrl());
}

export function hrefSignUp(): string {
  return r(buildWelcomeSignUpUrl());
}

/** Full Help page with optional deep link to a Knowledge topic. */
export function hrefHelpPage(topicId?: string): string {
  return r(buildHelpUrl(topicId ? { topic: topicId } : undefined));
}

/**
 * Legacy intent name retained for callers; routes to canonical Help page.
 */
export function hrefDashboardKnowledgeOverlay(): string {
  return r(buildHelpUrl());
}

/** Full integrations + settings page (Chrome `options_ui`); not the Cockpit “connections” workstream. */
export function hrefExtensionIntegrationsPage(): string {
  return r(PAGE.integrations);
}

/**
 * @deprecated Prefer {@link hrefExtensionIntegrationsPage} — name implied Cockpit “connections” workstream.
 * Still resolves to `integrations.html` (Chrome options / hub).
 */
export function hrefCockpitConnections(): string {
  return hrefExtensionIntegrationsPage();
}
