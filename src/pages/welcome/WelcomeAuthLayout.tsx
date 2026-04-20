import type { ReactNode } from 'react';
import { WelcomeBackdrop } from './WelcomeBackdrop';

interface WelcomeAuthLayoutProps {
  children: ReactNode;
}

/**
 * Full-viewport centered auth column; cinematic ambient layer + theme tokens.
 */
export function WelcomeAuthLayout({ children }: WelcomeAuthLayoutProps) {
  return (
    <div className="bo-welcome-auth-root bo-welcome-cinematic-root relative min-h-screen bg-bg text-text">
      <WelcomeBackdrop />
      <div className="relative z-[1] mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-12 sm:px-6">
        {children}
      </div>
    </div>
  );
}
