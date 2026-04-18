import type { ReactNode } from 'react';

interface WelcomeAuthLayoutProps {
  children: ReactNode;
}

/**
 * Full-viewport centered auth column; uses theme tokens so light/dark stay consistent.
 */
export function WelcomeAuthLayout({ children }: WelcomeAuthLayoutProps) {
  return (
    <div className="bo-welcome-auth-root min-h-screen bg-bg text-text">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-12 sm:px-6">
        {children}
      </div>
    </div>
  );
}
