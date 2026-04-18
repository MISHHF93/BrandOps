import type { WelcomeAuthMode } from './welcomeUtils';

interface WelcomeSignInModeFooterProps {
  authMode: WelcomeAuthMode;
  onModeChange: (mode: WelcomeAuthMode) => void;
}

export function WelcomeSignInModeFooter({ authMode, onModeChange }: WelcomeSignInModeFooterProps) {
  return (
    <p className="mt-8 text-center text-sm text-textSoft">
      {authMode === 'signUp' ? (
        <>
          Already have an account?{' '}
          <button
            type="button"
            className="font-semibold text-primary hover:text-primaryHover underline-offset-2 hover:underline"
            onClick={() => onModeChange('signIn')}
          >
            Sign in
          </button>
        </>
      ) : (
        <>
          New to BrandOps?{' '}
          <button
            type="button"
            className="font-semibold text-primary hover:text-primaryHover underline-offset-2 hover:underline"
            onClick={() => onModeChange('signUp')}
          >
            Create an account
          </button>
        </>
      )}
    </p>
  );
}
