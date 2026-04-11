import { PropsWithChildren } from 'react';

export function Card({ children }: PropsWithChildren) {
  return <section className="glass p-4">{children}</section>;
}
