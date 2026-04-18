export type OAuthButtonVariant = 'signIn' | 'continue' | 'signUp';

/**
 * Outlined “Sign in / Sign up with …” row (reference: common OAuth marketing forms):
 * light surface, strong border, brand mark + label, comfortable tap target.
 */
export const oauthOutlinedButtonClass = [
  'inline-flex min-h-[44px] items-center justify-center gap-3 rounded-lg',
  'border-2 border-border bg-bg px-4 py-2.5 text-sm font-semibold text-text shadow-sm',
  'transition hover:bg-bg/70 disabled:cursor-not-allowed disabled:opacity-60'
].join(' ');

/** Minimal SaaS auth: neutral field, subtle border, no strong accent tint. */
export const oauthWelcomeMarketingOutlineClass =
  '!border-border !bg-bgElevated !shadow-none hover:!bg-surface/55';
