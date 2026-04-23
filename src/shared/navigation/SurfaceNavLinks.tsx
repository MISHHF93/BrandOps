import { getPrivacyPolicyHref } from '../config/privacyPolicyUrl';
import {
  hrefExtensionIntegrationsPage,
  hrefHelpPage,
  hrefPrimaryAppChat,
  hrefPrimaryAppIntegrationsTab,
  hrefPrimaryAppPulse,
  hrefPrimaryAppSettingsTab,
  hrefPrimaryAppToday,
  hrefSignIn,
  hrefSignUp
} from './navigationIntents';

const linkClass = 'font-medium text-textMuted hover:text-text underline-offset-2 hover:underline';

export interface SurfaceNavLinksProps {
  className?: string;
}

/**
 * Footer: account + primary shell destinations + Help + Privacy.
 * Labels match `navigationIntents` (tab vs `integrations.html` page).
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
  const integrationsTabHref = hrefPrimaryAppIntegrationsTab();
  const integrationsHubHref = hrefExtensionIntegrationsPage();
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
        Pulse
      </a>
      <a className={linkClass} href={mainAppChatHref}>
        Chat
      </a>
      <a className={linkClass} href={todayHref} title="mobile.html?section=today">
        Today
      </a>
      <a className={linkClass} href={integrationsTabHref} title="mobile.html?section=integrations">
        Integrations tab
      </a>
      <a
        className={linkClass}
        href={integrationsHubHref}
        title="integrations.html — extension hub / options"
      >
        Integrations page
      </a>
      <a className={linkClass} href={settingsHref}>
        Settings
      </a>
      <a className={linkClass} href={helpPageHref}>
        Help
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
