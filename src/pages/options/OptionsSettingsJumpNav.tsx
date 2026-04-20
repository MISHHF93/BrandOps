import { Database, FlaskConical, Plug2, Rocket, SlidersHorizontal } from 'lucide-react';

const LINKS = [
  { id: 'options-getting-started', label: 'Getting started', Icon: Rocket },
  { id: 'options-core-setup', label: 'Core setup', Icon: SlidersHorizontal },
  { id: 'options-integrations', label: 'Integrations', Icon: Plug2 },
  { id: 'options-workspace-data', label: 'Workspace data', Icon: Database },
  { id: 'options-advanced-tools', label: 'Advanced tools', Icon: FlaskConical }
] as const;

/** In-page anchors for Settings sections (icon + label per ICONOGRAPHY.md). */
export function OptionsSettingsJumpNav() {
  return (
    <nav
      aria-label="Jump to settings section"
      className="flex flex-wrap gap-2 rounded-xl border border-border/60 bg-surface/40 p-2.5"
    >
      {LINKS.map(({ id, label, Icon }) => (
        <a
          key={id}
          href={`#${id}`}
          className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-bg/40 px-2.5 py-1.5 text-xs font-medium text-text transition hover:border-primary/50 hover:bg-surface/60"
        >
          <Icon size={15} strokeWidth={2} className="shrink-0 text-primary/90" aria-hidden />
          {label}
        </a>
      ))}
    </nav>
  );
}
