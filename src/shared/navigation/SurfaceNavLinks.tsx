import { getPrivacyPolicyHref } from '../config/privacyPolicyUrl';
import { buildWelcomeSignInUrl, buildWelcomeSignUpUrl, PAGE } from './extensionLinks';
import { resolveExtensionUrl } from './extensionRuntime';
import { openExtensionSurface } from './openExtensionSurface';

const linkClass =
  'font-medium text-textMuted hover:text-text underline-offset-2 hover:underline';

export interface SurfaceNavLinksProps {
  className?: string;
}

/**
 * Hierarchy: Sign in (OAuth gateway, bare welcome) → Sign up (?flow=signup) → workspace → legal.
 */
export function SurfaceNavLinks({ className }: SurfaceNavLinksProps) {
  const privacyHref = getPrivacyPolicyHref();
  const privacyHosted = privacyHref.startsWith('https://');
  const signInHref = resolveExtensionUrl(buildWelcomeSignInUrl());
  const signUpHref = resolveExtensionUrl(buildWelcomeSignUpUrl());
  const settingsHref = resolveExtensionUrl(PAGE.options);

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
      <button type="button" className={linkClass} onClick={() => openExtensionSurface('dashboard')}>
        Dashboard
      </button>
      <a className={linkClass} href={settingsHref}>
        Settings
      </a>
      <button type="button" className={linkClass} onClick={() => openExtensionSurface('help')}>
        Knowledge Center
      </button>
      <button
        type="button"
        className={linkClass}
        onClick={() => openExtensionSurface('integration-hub')}
      >
        Connections
      </button>
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
