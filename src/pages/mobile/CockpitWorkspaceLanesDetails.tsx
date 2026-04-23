import { workspaceModuleToDashboardSection, type DashboardSectionId } from '../../shared/config/dashboardNavigation';
import { workspaceModules } from '../../shared/config/modules';
import type { WorkspaceModuleId } from '../../types/domain';
import type { CockpitWorkspaceLanesDetailsProps } from './cockpitSectionTypes';

const MODULE_WORKSTREAM: Partial<Record<WorkspaceModuleId, DashboardSectionId>> = {
  ...workspaceModuleToDashboardSection,
  'command-center': 'today',
  settings: 'connections',
  'linkedin-companion': 'brand-content'
};

const MODULE_TRY_COMMAND: Partial<Record<WorkspaceModuleId, string>> = {
  /** `pipeline-crm` owns the sole `pipeline health` Chat starter; Command center uses “Go to Today” only. */
  'brand-vault': 'add content: brand narrative asset',
  'content-library': 'add content: library seed idea',
  'publishing-queue': 'draft post: weekly insight from the workspace',
  'outreach-workspace': 'draft outreach: warm follow-up after intro call',
  'pipeline-crm': 'pipeline health',
  'scheduler-engine': 'create follow up: weekly plan review',
  'linkedin-companion': 'add note: LinkedIn companion capture',
  settings: 'configure: cadence balanced, remind before 20 min'
};

const SECTION_JUMP_LABEL: Record<DashboardSectionId, string> = {
  today: 'Today',
  pipeline: 'Pipeline',
  'brand-content': 'Brand & content',
  connections: 'Connections'
};

export const CockpitWorkspaceLanesDetails = ({
  btnFocus,
  commandBusy,
  runCommand,
  onSelectWorkstream
}: CockpitWorkspaceLanesDetailsProps) => (
  <details className="group scroll-mt-28 rounded-xl border border-white/10 bg-zinc-950/25 p-3 open:shadow-inner">
    <summary
      className={`cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-zinc-500 ${btnFocus} [&::-webkit-details-marker]:hidden`}
    >
      <span className="inline-flex items-center gap-2">
        Workspace lanes (from product modules)
        <span className="text-[10px] font-normal normal-case text-zinc-600 group-open:hidden">(tap)</span>
      </span>
    </summary>
    <p className="mt-2 text-[10px] leading-snug text-zinc-600">
      Maps your migrated web-era modules to Today work areas and Chat commands — deep panels were folded into the agent;
      this is your compass.
    </p>
    <ul className="mt-3 space-y-3">
      {workspaceModules
        .filter((m) => m.status === 'active')
        .map((m) => {
          const section = MODULE_WORKSTREAM[m.id];
          const seed = MODULE_TRY_COMMAND[m.id];
          return (
            <li key={m.id} className="rounded-lg border border-white/5 bg-zinc-900/40 p-2.5">
              <p className="text-[12px] font-medium text-zinc-100">{m.title}</p>
              <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">{m.description}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {section ? (
                  <button
                    type="button"
                    onClick={() => onSelectWorkstream(section)}
                    className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-[10px] ${btnFocus}`}
                  >
                    Go to {SECTION_JUMP_LABEL[section]}
                  </button>
                ) : null}
                {seed ? (
                  <button
                    type="button"
                    disabled={commandBusy}
                    onClick={() => void runCommand(seed)}
                    className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-[10px] ${btnFocus} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    Run starter in Chat
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
    </ul>
  </details>
);
