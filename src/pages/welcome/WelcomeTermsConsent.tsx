import { getPrivacyPolicyHref } from '../../shared/config/privacyPolicyUrl';
import { openExtensionSurface } from '../../shared/navigation/openExtensionSurface';

interface WelcomeTermsConsentProps {
  accepted: boolean;
  onAcceptedChange: (next: boolean) => void;
}

export function WelcomeTermsConsent({ accepted, onAcceptedChange }: WelcomeTermsConsentProps) {
  const privacyHref = getPrivacyPolicyHref();
  const hosted = privacyHref.startsWith('https://');

  return (
    <div className="mt-7">
      <label className="flex cursor-pointer items-start gap-3 text-left text-sm text-textMuted">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onAcceptedChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary text-primary focus:ring-focusRing"
        />
        <span>
          I agree to the{' '}
          <button
            type="button"
            className="font-semibold text-primary hover:text-primaryHover underline-offset-2 hover:underline"
            onClick={() => openExtensionSurface('help')}
          >
            Terms of Service
          </button>{' '}
          and{' '}
          <a
            className="font-semibold text-primary hover:text-primaryHover underline-offset-2 hover:underline"
            href={privacyHref}
            {...(hosted ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
          >
            Privacy Policy
          </a>
          .
        </span>
      </label>
    </div>
  );
}
