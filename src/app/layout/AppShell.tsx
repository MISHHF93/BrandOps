import { PropsWithChildren } from 'react';

export function AppShell({ children }: PropsWithChildren) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-bg to-[#070A11] p-4 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">{children}</div>
    </main>
  );
}
