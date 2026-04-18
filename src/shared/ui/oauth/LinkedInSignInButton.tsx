/** Sign in / Sign up with LinkedIn — “in” mark in brand blue on light outlined row. */

import { oauthOutlinedButtonClass, type OAuthButtonVariant } from './oauthButtonStyles';

const LinkedInMark = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden className="shrink-0">
    <path
      fill="#0A66C2"
      d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
    />
  </svg>
);

export interface LinkedInSignInButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: OAuthButtonVariant;
  className?: string;
}

export function LinkedInSignInButton({
  onClick,
  disabled,
  loading,
  variant = 'signIn',
  className
}: LinkedInSignInButtonProps) {
  const label =
    variant === 'continue'
      ? loading
        ? 'Connecting…'
        : 'Continue with LinkedIn'
      : variant === 'signUp'
        ? loading
          ? 'Connecting…'
          : 'Sign up with LinkedIn'
        : loading
          ? 'Connecting…'
          : 'Sign in with LinkedIn';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={[oauthOutlinedButtonClass, className ?? ''].join(' ').trim()}
    >
      <LinkedInMark />
      <span>{label}</span>
    </button>
  );
}
