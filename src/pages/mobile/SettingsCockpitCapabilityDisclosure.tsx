import { appShellTabLabel, cockpitCapabilities } from '../../shared/config/capabilityMap';
import { MobileTabSection } from './mobileTabPrimitives';

export function SettingsCockpitCapabilityDisclosure({ btnFocus }: { btnFocus: string }) {
  return (
    <MobileTabSection
      id="settings-cockpit-capabilities"
      title="Capability map"
      description="Where major product areas map in this shell (from shared config)."
    >
      <details className="group mt-2 rounded-lg border border-white/5 bg-zinc-950/30 p-2 open:border-indigo-500/20">
        <summary
          className={`cursor-pointer list-none text-[10px] font-semibold uppercase tracking-wide text-zinc-500 ${btnFocus} [&::-webkit-details-marker]:hidden`}
        >
          <span className="inline-flex items-center gap-2">
            Expand capability index
            <span className="text-[10px] font-normal normal-case text-zinc-600 group-open:hidden">
              ({cockpitCapabilities.length} areas)
            </span>
          </span>
        </summary>
        <ul className="mt-3 max-h-[min(28rem,55vh)] space-y-3 overflow-y-auto text-[11px] [scrollbar-width:thin]">
          {cockpitCapabilities.map((c) => (
            <li key={c.id} className="rounded-lg border border-white/5 bg-zinc-900/40 p-2.5">
              <p className="font-medium text-zinc-100">{c.label}</p>
              <p className="mt-1 text-[10px] leading-snug text-zinc-500">{c.summary}</p>
              <p className="mt-1.5 text-[10px] text-zinc-400">
                Primary: <span className="text-zinc-200">{appShellTabLabel(c.primaryTab)}</span>
                {c.secondaryTabs.length > 0 ? (
                  <>
                    {' '}
                    · Secondary: {c.secondaryTabs.map((t) => appShellTabLabel(t)).join(', ')}
                  </>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      </details>
    </MobileTabSection>
  );
}
