import { appShellTabLabel, cockpitCapabilities } from '../../shared/config/capabilityMap';
import { MobileTabSection } from './mobileTabPrimitives';

export function SettingsCockpitCapabilityDisclosure({ btnFocus }: { btnFocus: string }) {
  return (
    <MobileTabSection
      id="settings-cockpit-capabilities"
      title="Capability map"
      description="Where major product areas map in this shell (from shared config)."
    >
      <details className="group mt-2 rounded-lg border border-border/30 bg-surface/45 p-2 open:border-primary/25">
        <summary
          className={`cursor-pointer list-none text-[10px] font-semibold uppercase tracking-wide text-textMuted ${btnFocus} [&::-webkit-details-marker]:hidden`}
        >
          <span className="inline-flex items-center gap-2">
            Expand capability index
            <span className="text-[10px] font-normal normal-case text-textSoft group-open:hidden">
              ({cockpitCapabilities.length} areas)
            </span>
          </span>
        </summary>
        <ul className="mt-3 max-h-[min(28rem,55vh)] space-y-3 overflow-y-auto text-[11px] [scrollbar-width:thin]">
          {cockpitCapabilities.map((c) => (
            <li key={c.id} className="rounded-lg border border-border/30 bg-surface/55 p-2.5">
              <p className="font-medium text-text">{c.label}</p>
              <p className="mt-1 text-[10px] leading-snug text-textMuted">{c.summary}</p>
              <p className="mt-1.5 text-[10px] text-textSoft">
                Primary: <span className="text-text">{appShellTabLabel(c.primaryTab)}</span>
                {c.secondaryTabs.length > 0 ? (
                  <> · Secondary: {c.secondaryTabs.map((t) => appShellTabLabel(t)).join(', ')}</>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      </details>
    </MobileTabSection>
  );
}
