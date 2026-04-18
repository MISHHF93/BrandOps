import type { ReactNode } from 'react';

interface WelcomePlaceholderCardProps {
  children: ReactNode;
}

/** Loading and error states share the same shell as the main auth card. */
export function WelcomePlaceholderCard({ children }: WelcomePlaceholderCardProps) {
  return (
    <div className="mx-auto w-full max-w-lg rounded-2xl border border-border bg-bgElevated px-6 py-8 shadow-panel sm:px-8">
      {children}
    </div>
  );
}
