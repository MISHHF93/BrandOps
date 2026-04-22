import { getPrivacyPolicyHref } from '../config/privacyPolicyUrl';
import {
  hrefCockpitConnections,
  hrefDashboardKnowledgeOverlay,
  hrefHelpPage,
  hrefPrimaryAppChat,
  hrefPrimaryAppSettingsTab,
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
 * (Legacy `dashboard.html` kept for URLs that need Chat + overlay; see `hrefDashboardKnowledgeOverlay`.)
 */
export function SurfaceNavLinks({ className }: SurfaceNavLinksProps) {
  const privacyHref = getPrivacyPolicyHref();
  const privacyHosted = privacyHref.startsWith('https://');
  const signInHref = hrefSignIn();
  const signUpHref = hrefSignUp();
  const settingsHref = hrefPrimaryAppSettingsTab();
  const mainAppChatHref = hrefPrimaryAppChat();
  const knowledgeOverlayHref = hrefDashboardKnowledgeOverlay();
  const helpPageHref = hrefHelpPage();
  const connectionsHref = hrefCockpitConnections();

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
      <a className={linkClass} href={mainAppChatHref}>
        Main app (Chat)
      </a>
      <a className={linkClass} href={settingsHref}>
        Settings
      </a>
      <a className={linkClass} href={knowledgeOverlayHref}>
        Knowledge (in dashboard)
      </a>
      <a className={linkClass} href={helpPageHref}>
        Help page
      </a>
      <a className={linkClass} href={connectionsHref}>
        Integrations
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
