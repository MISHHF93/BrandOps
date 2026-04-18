import { welcomeCrownSrc } from './welcomeUtils';
import type { WelcomeAuthMode } from './welcomeUtils';

interface WelcomeHeroProps {
  signedIn: boolean;
  authMode: WelcomeAuthMode;
}

export function WelcomeHero({ signedIn, authMode }: WelcomeHeroProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <img src={welcomeCrownSrc()} alt="BrandOps" width={40} height={40} className="mb-3 h-10 w-10" />
      <h1 className="text-[1.75rem] font-semibold tracking-tight text-text">
        {signedIn
          ? "You're signed in"
          : authMode === 'signUp'
            ? 'Create your BrandOps account'
            : 'Sign in to BrandOps'}
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-textSoft">
        {signedIn
          ? 'Continue to your workspace. Manage or disconnect accounts in Settings anytime.'
          : 'Use Google, GitHub, or LinkedIn. Your workspace stays on this device unless you export it.'}
      </p>
    </div>
  );
}
