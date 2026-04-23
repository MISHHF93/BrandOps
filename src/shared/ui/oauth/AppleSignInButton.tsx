import { oauthOutlinedButtonClass, type OAuthButtonVariant } from './oauthButtonStyles';

const AppleMark = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden className="shrink-0">
    <path
      fill="currentColor"
      d="M17.048 12.936c.022 2.299 2.019 3.064 2.041 3.073-.017.054-.313 1.078-1.032 2.136-.622.915-1.267 1.827-2.284 1.846-1 .018-1.322-.594-2.467-.594-1.146 0-1.503.576-2.449.612-.983.037-1.733-.986-2.36-1.897-1.284-1.856-2.265-5.244-.947-7.533.654-1.137 1.823-1.856 3.092-1.874.965-.018 1.877.649 2.467.649.59 0 1.699-.803 2.863-.685.487.02 1.854.197 2.732 1.481-.071.044-1.63.953-1.656 2.786ZM15.02 5.843c.521-.632.874-1.51.778-2.386-.75.03-1.654.499-2.192 1.13-.482.56-.904 1.457-.789 2.315.837.065 1.682-.424 2.203-1.059Z"
    />
  </svg>
);

export interface AppleSignInButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: OAuthButtonVariant;
  className?: string;
}

export function AppleSignInButton({
  onClick,
  disabled,
  loading,
  variant = 'signIn',
  className
}: AppleSignInButtonProps) {
  const label =
    variant === 'continue'
      ? loading
        ? 'Connecting…'
        : 'Continue with Apple'
      : variant === 'signUp'
        ? loading
          ? 'Connecting…'
          : 'Sign up with Apple'
        : loading
          ? 'Connecting…'
          : 'Sign in with Apple';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={[oauthOutlinedButtonClass, className ?? ''].join(' ').trim()}
    >
      <AppleMark />
      <span>{label}</span>
    </button>
  );
}
