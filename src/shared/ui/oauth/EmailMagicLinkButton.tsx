import { Mail } from 'lucide-react';
import { oauthOutlinedButtonClass, type OAuthButtonVariant } from './oauthButtonStyles';

export interface EmailMagicLinkButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: OAuthButtonVariant;
  className?: string;
}

export function EmailMagicLinkButton({
  onClick,
  disabled,
  loading,
  variant = 'signIn',
  className
}: EmailMagicLinkButtonProps) {
  const label =
    variant === 'continue'
      ? loading
        ? 'Connecting…'
        : 'Continue with Email'
      : variant === 'signUp'
        ? loading
          ? 'Connecting…'
          : 'Sign up with Email'
        : loading
          ? 'Connecting…'
          : 'Email magic link';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={[oauthOutlinedButtonClass, className ?? ''].join(' ').trim()}
    >
      <Mail size={18} aria-hidden className="shrink-0" />
      <span>{label}</span>
    </button>
  );
}
