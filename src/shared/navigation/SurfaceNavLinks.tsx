import { getPrivacyPolicyHref } from '../config/privacyPolicyUrl';
import {
  hrefCockpitWorkstream,
  hrefDashboardKnowledgeOverlay,
  hrefExtensionIntegrationsPage,
  hrefHelpPage,
  hrefPrimaryAppChat,
  hrefPrimaryAppIntegrationsTab,
  hrefPrimaryAppPipeline,
  hrefPrimaryAppPulse,
  hrefPrimaryAppSettingsTab,
  hrefPrimaryAppToday,
  hrefSignIn,
  hrefSignUp
} from './navigationIntents';

const linkClass =
  'font-medium text-textMuted hover:text-text underline-offset-2 hover:underline';

export interface SurfaceNavLinksProps {
  className?: string;
}

/**
 * Footer links: sign-in flow → primary app (`mobile.html`) by tab, Help page, legal.
 * Primary app is `mobile.html`. `dashboard.html?overlay=help` is for embedded Knowledge overlay; see `hrefDashboardKnowledgeOverlay`.
 */
export function SurfaceNavLinks({ className }: SurfaceNavLinksProps) {
  const privacyHref = getPrivacyPolicyHref();
  const privacyHosted = privacyHref.startsWith('https://');
  const signInHref = hrefSignIn();
  const signUpHref = hrefSignUp();
  const settingsHref = hrefPrimaryAppSettingsTab();
  const mainAppChatHref = hrefPrimaryAppChat();
  const pulseHref = hrefPrimaryAppPulse();
  const todayHref = hrefPrimaryAppToday();
  const pipelineHref = hrefPrimaryAppPipeline();
  const brandContentHref = hrefCockpitWorkstream('brand-content');
  const connectionsWorkstreamHref = hrefCockpitWorkstream('connections');
  const integrationsTabHref = hrefPrimaryAppIntegrationsTab();
  const integrationsHubHref = hrefExtensionIntegrationsPage();
  const knowledgeOverlayHref = hrefDashboardKnowledgeOverlay();
  const helpPageHref = hrefHelpPage();

  return (
    <div
      className={
        className ??
        'flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-textSoft'
      }
    >
      <a className={linkClass} href={signInHref}>
        Sign in
      </a>
      <a className={linkClass} href={signUpHref}>
        Sign up
      </a>
      <a className={linkClass} href={pulseHref} title="mobile.html?section=pulse">
        Pulse (timeline)
      </a>
      <a className={linkClass} href={mainAppChatHref}>
        Primary app (Chat)
      </a>
      <a className={linkClass} href={todayHref} title="mobile.html?section=today">
        Today (cockpit)
      </a>
      <a className={linkClass} href={pipelineHref} title="mobile.html?section=pipeline">
        Pipeline
      </a>
      <a className={linkClass} href={brandContentHref} title="mobile.html?section=brand-content">
        Brand &amp; content
      </a>
      <a className={linkClass} href={connectionsWorkstreamHref} title="mobile.html?section=connections">
        Connections (cockpit)
      </a>
      <a className={linkClass} href={integrationsTabHref} title="mobile.html?section=integrations">
        Integrations (in app)
      </a>
      <a className={linkClass} href={integrationsHubHref} title="integrations.html — extension hub / options">
        Integrations hub
      </a>
      <a className={linkClass} href={settingsHref}>
        Settings
      </a>
      <a
        className={linkClass}
        href={knowledgeOverlayHref}
        title="Opens dashboard.html with Knowledge overlay; same shell as mobile after load"
      >
        Knowledge overlay
      </a>
      <a className={linkClass} href={helpPageHref}>
        Help (full page)
      </a>
      <a
        className={linkClass}
        href={privacyHref}
        {...(privacyHosted ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      >
        Privacy
      </a>
    </div>
  );
}
