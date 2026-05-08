import clsx from 'clsx';
import type { AppDocumentSurfaceId } from '../../shared/navigation/appDocumentSurface';
import {
  hrefExtensionIntegrationsPage,
  hrefHelpPage
} from '../../shared/navigation/navigationIntents';
import type { IntegrationSourceKind } from '../../types/domain';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';
import {
  hubSourceHonestyPills,
  INTEGRATION_REGISTRY_HELP_TOPIC_ID,
  type HubHonestyPillTone
} from '../../shared/integrations/integrationHonesty';
import {
  ALL_INTEGRATION_SOURCE_KINDS,
  integrationPresetForKind
} from '../../shared/integrations/integrationSourceCatalog';
import { MobileTabSection, mobileChipClass } from './mobileTabPrimitives';
import { WorkspaceSignalsBoard } from './WorkspaceSignalsBoard';

const chipDisabled = 'disabled:cursor-not-allowed disabled:opacity-50';

function integrationKindDisplay(kind: string): string {
  if ((ALL_INTEGRATION_SOURCE_KINDS as readonly string[]).includes(kind)) {
    return integrationPresetForKind(kind as IntegrationSourceKind).label;
  }
  return kind;
}

function HonestyPill({ label, tone }: { label: string; tone: HubHonestyPillTone }) {
  const toneClass =
    tone === 'info'
      ? 'border-info/35 bg-info/10 text-textSoft'
      : tone === 'muted'
        ? 'border-border/40 bg-bg/50 text-textMuted'
        : 'border-border/55 bg-surface/45 text-textSoft';

  return (
    <span
      className={clsx(
        'inline-flex shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
        toneClass
      )}
    >
      {label}
    </span>
  );
}

/** Chat-primed shortcuts — registers integration hub presets (see `integrationSourceCatalog`). */
const INTEGRATION_QUICK_GROUPS: {
  heading: string;
  chips: { label: string; command: string }[];
}[] = [
  {
    heading: 'CRM & pipeline',
    chips: [
      { label: 'HubSpot', command: 'connect hubspot source: Primary CRM' },
      { label: 'Salesforce', command: 'connect salesforce source: RevOps workspace' },
      { label: 'Pipedrive', command: 'connect pipedrive source: SMB pipeline' }
    ]
  },
  {
    heading: 'Product & support',
    chips: [
      { label: 'Linear', command: 'connect linear source: Product backlog' },
      { label: 'Jira', command: 'connect jira source: Delivery board' },
      { label: 'Zendesk', command: 'connect zendesk source: Support desk' }
    ]
  },
  {
    heading: 'Docs & files',
    chips: [
      { label: 'Notion', command: 'connect notion source: Growth workspace' },
      { label: 'Google Drive', command: 'connect google drive source: Brand kit' },
      { label: 'Airtable', command: 'connect airtable source: Ops base' },
      { label: 'RSS feed', command: 'add source: rss industry headlines' }
    ]
  },
  {
    heading: 'Engineering & automation',
    chips: [
      { label: 'GitHub', command: 'connect github source: Application repos' },
      { label: 'Slack', command: 'connect slack source: GTM workspace' },
      { label: 'Webhook', command: 'add source: webhook pipeline events' }
    ]
  },
  {
    heading: 'Growth & finance',
    chips: [
      { label: 'Meta Ads', command: 'connect meta ads source: Paid social' },
      { label: 'LinkedIn campaigns', command: 'connect linkedin marketing source: B2B ads' },
      { label: 'Stripe', command: 'connect stripe source: Subscription billing' }
    ]
  },
  {
    heading: 'Microsoft & Google Workspace',
    chips: [
      { label: 'Microsoft 365', command: 'connect microsoft 365 source: Company tenant' },
      { label: 'Google Workspace', command: 'connect google workspace source: Operator calendar' }
    ]
  },
  {
    heading: 'Artifacts & infra',
    chips: [
      {
        label: 'Sample artifact',
        command:
          'add integration artifact: title: Weekly metrics rollup summary: Paste export highlights'
      },
      {
        label: 'SSH staging',
        command: 'add ssh: name: staging host: staging.internal port: 22 user: deploy'
      }
    ]
  }
];

export interface MobileIntegrationsViewProps {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  /** True while an agent command round-trip is in flight (disables command chips). */
  commandBusy?: boolean;
  runCommand: (command: string) => void | Promise<void>;
  documentSurface?: AppDocumentSurfaceId | 'chatbot';
}

/**
 * Integrations-only: provider health and command shortcuts. No Cockpit/Settings duplicates; no “recent” audit list.
 * Matches the in-tab density of {@link MobileSettingsView}.
 */
export const MobileIntegrationsView = ({
  snapshot,
  btnFocus,
  commandBusy = false,
  runCommand,
  documentSurface = 'mobile'
}: MobileIntegrationsViewProps) => {
  return (
    <div className="space-y-4" aria-label="Integrations">
      <span className="sr-only">
        Connect tools and data — hub registry (local), sync-hub preferences (Google, GitHub,
        LinkedIn), and captured artifacts. Account rules live in Settings.
      </span>

      <article className="bo-flagship-surface">
        <WorkspaceSignalsBoard
          metrics={snapshot}
          variant="integrations"
          includeKeys={['src', 'oauth']}
          cellOverrides={{
            oauth: {
              label: 'Sync hub',
              sub: '3 slots',
              title:
                'Google, GitHub, and LinkedIn sync-hub preference rows (connected vs disconnected).'
            }
          }}
        />

        <div className="bo-vitality-frame-body space-y-3 px-3 pb-3 pt-2 sm:px-3.5">
          {documentSurface !== 'integrations' ? (
            <details className="bo-disclosure px-2.5 py-2 text-[11px] text-textMuted">
              <summary
                className={`cursor-pointer list-none text-textSoft [&::-webkit-details-marker]:hidden ${btnFocus}`}
              >
                <span className="font-medium text-text">Extension options (Chrome)</span>
              </summary>
              <p className="mt-1.5 leading-snug">
                <a
                  href={hrefExtensionIntegrationsPage()}
                  className={`font-medium text-info underline underline-offset-2 ${btnFocus}`}
                >
                  Open integrations page
                </a>
                <span className="text-textMuted"> — opens extension options.</span>
              </p>
            </details>
          ) : null}

          <details className="bo-disclosure group">
            <summary
              className={`cursor-pointer list-none rounded-xl px-3 py-2.5 text-sm font-semibold text-text ${btnFocus} [&::-webkit-details-marker]:hidden`}
            >
              Sources & providers
            </summary>
            <div className="space-y-4 border-t border-border/30 px-3 pb-3 pt-3">
              <MobileTabSection
                id="integrations-registered-sources"
                title="Registered sources"
                description="Hub rows stored in this workspace (registry)."
                descriptionVisibility="sr-only"
              >
                <p className="mt-2 text-[11px] leading-relaxed text-textMuted">
                  Rows are <strong className="font-medium text-textSoft">saved locally</strong> —
                  Chat registers intent and defaults; background vendor sync is not bundled yet.{' '}
                  <a
                    href={hrefHelpPage(INTEGRATION_REGISTRY_HELP_TOPIC_ID)}
                    className={clsx('font-medium text-info underline underline-offset-2', btnFocus)}
                  >
                    How the registry works
                  </a>
                  .
                </p>
                {snapshot.integrationHubSources.length === 0 ? (
                  <p className="mt-2 text-[11px] text-textMuted">
                    No sources yet. Use Add via Chat below or Chat for custom{' '}
                    <code className="text-[10px]">connect</code> /{' '}
                    <code className="text-[10px]">add source</code> lines.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {snapshot.integrationHubSources.slice(0, 20).map((row) => (
                      <li
                        key={row.id}
                        className="flex flex-col gap-1.5 rounded-lg border border-border/30 bg-surface/45 px-2 py-2 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-medium text-text">{row.name}</p>
                          <p className="mt-0.5 text-[10px] text-textMuted">
                            {integrationKindDisplay(row.kind)}{' '}
                            <span className="font-mono text-textSoft">({row.kind})</span>
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {hubSourceHonestyPills(row.status).map((pill) => (
                              <HonestyPill key={`${row.id}-${pill.label}`} {...pill} />
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={commandBusy}
                          onClick={() =>
                            void runCommand(`add note: check integration source ${row.name}`)
                          }
                          className={`${mobileChipClass(btnFocus)} ${chipDisabled} shrink-0`}
                        >
                          Review in Chat
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {snapshot.integrationHubSources.length > 20 ? (
                  <p className="mt-2 text-[10px] text-textMuted">
                    Showing 20 of {snapshot.integrationSources}. More in Chat.
                  </p>
                ) : null}
              </MobileTabSection>

              <MobileTabSection
                id="integrations-providers"
                title="Sync hub"
                description="Google, GitHub, and LinkedIn preference rows from Settings—not every integration kind."
                descriptionVisibility="sr-only"
              >
                <p className="mt-2 text-[11px] leading-relaxed text-textMuted">
                  Three extension sync slots only (Google, GitHub, LinkedIn). Status reflects saved
                  preferences — OAuth completion depends on your shipped build.
                </p>
                <ul className="mt-2 space-y-1.5 text-textMuted">
                  {snapshot.providerStatuses.map((provider) => (
                    <li key={provider.id} className="flex justify-between gap-2 text-[11px]">
                      <span className="text-textSoft">{provider.id}</span>
                      <span className="text-text">{provider.status}</span>
                    </li>
                  ))}
                </ul>
              </MobileTabSection>
            </div>
          </details>

          {snapshot.externalSyncLinksPeek.length > 0 ||
          snapshot.integrationLiveFeedPeek.length > 0 ? (
            <details className="bo-disclosure group">
              <summary
                className={`cursor-pointer list-none rounded-xl px-3 py-2.5 text-sm font-semibold text-text ${btnFocus} [&::-webkit-details-marker]:hidden`}
              >
                Activity & sync details
              </summary>
              <div className="space-y-4 border-t border-border/30 px-3 pb-3 pt-3">
                {snapshot.externalSyncLinksPeek.length > 0 ? (
                  <MobileTabSection
                    id="integrations-external-sync"
                    title="External sync"
                    description="Links between workspace entities and external calendars/tasks."
                    descriptionVisibility="sr-only"
                  >
                    <ul className="mt-2 space-y-2">
                      {snapshot.externalSyncLinksPeek.map((row) => (
                        <li
                          key={row.id}
                          className="rounded-lg border border-border/30 bg-surface/45 px-2 py-2 text-[11px] text-textMuted"
                        >
                          <p className="font-medium text-text">
                            {row.provider} · {row.resourceType}
                          </p>
                          <p className="mt-0.5 text-[10px] text-textMuted">
                            {row.sourceType} · synced {row.lastSyncedAt}
                          </p>
                          <button
                            type="button"
                            disabled={commandBusy}
                            onClick={() =>
                              void runCommand(`add note: review external sync ${row.id}`)
                            }
                            className={`mt-2 ${mobileChipClass(btnFocus)} ${chipDisabled}`}
                          >
                            Review in Chat
                          </button>
                        </li>
                      ))}
                    </ul>
                  </MobileTabSection>
                ) : null}

                {snapshot.integrationLiveFeedPeek.length > 0 ? (
                  <MobileTabSection
                    id="integrations-live-feed"
                    title="Hub activity"
                    description="Recent events from the integrations hub."
                    descriptionVisibility="sr-only"
                  >
                    <ul className="mt-2 space-y-2">
                      {snapshot.integrationLiveFeedPeek.map((row) => (
                        <li
                          key={row.id}
                          className="rounded-lg border border-border/30 bg-surface/45 px-2 py-2 text-[11px] text-textMuted"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 font-medium text-text">{row.title}</p>
                            <span
                              className={`shrink-0 text-[10px] font-medium uppercase ${
                                row.level === 'warning'
                                  ? 'text-warning'
                                  : row.level === 'success'
                                    ? 'text-success'
                                    : 'text-info'
                              }`}
                            >
                              {row.level}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[10px] text-textMuted">{row.source}</p>
                          <p className="mt-1 text-[10px] leading-snug text-textSoft">
                            {row.detail}
                          </p>
                          <p className="mt-1 text-[10px] text-textSoft">{row.happenedAt}</p>
                        </li>
                      ))}
                    </ul>
                  </MobileTabSection>
                ) : null}
              </div>
            </details>
          ) : null}

          <details className="bo-disclosure group">
            <summary
              className={`cursor-pointer list-none rounded-xl px-3 py-2.5 text-sm font-semibold text-text ${btnFocus} [&::-webkit-details-marker]:hidden`}
            >
              Technical inventory
              <span className="ml-2 text-[11px] font-normal text-textSoft">
                Captured artifacts and SSH targets
              </span>
            </summary>
            <div className="space-y-4 border-t border-border/30 px-3 pb-3 pt-3">
              <MobileTabSection
                id="integrations-artifacts"
                title="Captured artifacts"
                description="Workspace artifact rows (manual or agent); not automatic vendor pulls."
                descriptionVisibility="sr-only"
              >
                {snapshot.integrationArtifactsPeek.length === 0 ? (
                  <p className="mt-2 text-[11px] text-textMuted">
                    No artifacts yet. Total: {snapshot.integrationArtifactCount}.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {snapshot.integrationArtifactsPeek.map((row) => (
                      <li
                        key={row.id}
                        className="rounded-lg border border-border/30 bg-surface/45 px-2 py-2 text-[11px] text-textMuted"
                      >
                        <p className="font-medium text-text">{row.title}</p>
                        <p className="text-[10px] text-textMuted">{row.artifactType}</p>
                        <button
                          type="button"
                          disabled={commandBusy}
                          onClick={() =>
                            void runCommand(
                              `add note: review artifact ${row.title.replace(/"/g, "'")}`
                            )
                          }
                          className={`mt-2 ${mobileChipClass(btnFocus)} ${chipDisabled}`}
                        >
                          Review in Chat
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </MobileTabSection>

              <MobileTabSection
                id="integrations-ssh"
                title="SSH targets"
                description="Infrastructure targets registered in the workspace."
                descriptionVisibility="sr-only"
              >
                {snapshot.sshTargetsPeek.length === 0 ? (
                  <p className="mt-2 text-[11px] text-textMuted">
                    No SSH targets. Total: {snapshot.sshTargetsCount}.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {snapshot.sshTargetsPeek.map((row) => (
                      <li
                        key={row.id}
                        className="rounded-lg border border-border/30 bg-surface/45 px-2 py-2 text-[11px] text-textMuted"
                      >
                        <p className="font-medium text-text">{row.name}</p>
                        <p className="text-[10px] text-textMuted">{row.host}</p>
                        <button
                          type="button"
                          disabled={commandBusy}
                          onClick={() =>
                            void runCommand(`add note: SSH target ${row.name} (${row.host})`)
                          }
                          className={`mt-2 ${mobileChipClass(btnFocus)} ${chipDisabled}`}
                        >
                          Review in Chat
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </MobileTabSection>
            </div>
          </details>

          <details id="integrations-quick-add" className="bo-disclosure">
            <summary
              className={`cursor-pointer list-none rounded-xl px-3 py-2.5 text-sm font-semibold text-text ${btnFocus} [&::-webkit-details-marker]:hidden`}
            >
              Add via Chat
              <span className="ml-2 text-[11px] font-normal text-textSoft">
                CRM, issues, docs, ads — preset shortcuts
              </span>
            </summary>
            <div className="border-t border-border/30 px-3 pb-3 pt-3">
              <p className="sr-only">
                Registers hub sources locally. Sync hub OAuth covers Google, GitHub, and LinkedIn
                slots above; other vendors remain registry-only until connectors ship.
              </p>
              <div className="space-y-4">
                {INTEGRATION_QUICK_GROUPS.map((group) => (
                  <div key={group.heading}>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-textSoft">
                      {group.heading}
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      {group.chips.map((chip) => (
                        <button
                          key={`${group.heading}-${chip.label}`}
                          type="button"
                          disabled={commandBusy}
                          onClick={() => void runCommand(chip.command)}
                          className={`${mobileChipClass(btnFocus)} ${chipDisabled}`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>
        </div>
      </article>
    </div>
  );
};
