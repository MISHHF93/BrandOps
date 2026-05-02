import { Command, useCommandState } from 'cmdk';
import clsx from 'clsx';
import { BookOpen, History, Loader2, Sparkles, TriangleAlert } from 'lucide-react';
import { CHAT_QUICK_STARTER_GROUPS } from './chatCommandStarters';
import { COMMAND_PALETTE_NAV_TARGETS } from './mobileTabConfig';
import { MOBILE_BTN_FOCUS } from './mobileTabPrimitives';
import type { MobileShellTabId } from './mobileShellQuery';
import { BrandOpsMarkBadge } from '../../shared/ui/brandopsPolish';

const btn = MOBILE_BTN_FOCUS;

const cmdItemClass = clsx(
  'flex min-h-[2.5rem] cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 text-sm text-text',
  'aria-selected:bg-surfaceActive aria-selected:text-text',
  'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40',
  'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focusRing/80'
);

function FreeformRunItem({
  onRun,
  disabled
}: {
  onRun: (line: string) => void;
  disabled: boolean;
}) {
  const search = useCommandState((s) => s.search);
  const t = search.trim();
  if (!t || disabled) return null;
  return (
    <Command.Item
      className={cmdItemClass}
      value={`__run__ ${t}`}
      keywords={['run', 'chat', 'agent', 'send', t]}
      onSelect={() => onRun(t)}
    >
      <span className="text-text">Run in Chat</span>
      <span className="ml-2 min-w-0 flex-1 truncate font-mono text-[11px] text-textSoft" title={t}>
        {t}
      </span>
    </Command.Item>
  );
}

const navItemClass = clsx(
  'flex min-h-[2.5rem] cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 text-sm text-text',
  'aria-selected:bg-surfaceActive aria-selected:text-text',
  'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40',
  'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focusRing/80'
);

export interface WorkspaceCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When false, agent command items are hidden or disabled; navigation remains available. */
  canExecuteAgentCommands: boolean;
  /** Set when `canExecuteAgentCommands` is false so lock copy matches the active gate. */
  agentLockReason: 'auth' | 'membership' | null;
  commandBusy: boolean;
  commandHistory: string[];
  onNavigateTab: (tab: MobileShellTabId) => void;
  onRunCommand: (command: string) => void;
  onOpenHelp: () => void;
}

/**
 * Global command menu (cmdk) — all runs go through the same path as Chat Send: {@link executeAgentWorkspaceCommand}.
 */
export const WorkspaceCommandPalette = ({
  open,
  onOpenChange,
  canExecuteAgentCommands,
  agentLockReason,
  commandBusy,
  commandHistory,
  onNavigateTab,
  onRunCommand,
  onOpenHelp
}: WorkspaceCommandPaletteProps) => {
  const agentDisabled = !canExecuteAgentCommands || commandBusy;
  const lockHint =
    agentLockReason === 'auth'
      ? 'Sign in from Settings to run workspace commands. Tab navigation and Help stay open.'
      : agentLockReason === 'membership'
        ? 'Activate membership to run the agent from Chat and here. You can still use Settings, navigation, and Help.'
        : 'Workspace commands are unavailable from here right now. Navigation and Help stay open.';
  const recent = Array.from(new Set(commandHistory.map((c) => c.trim()).filter(Boolean))).slice(
    0,
    8
  );

  const closeAnd = (fn: () => void) => {
    onOpenChange(false);
    queueMicrotask(fn);
  };

  return (
    <Command.Dialog
      label="Workspace commands"
      open={open}
      onOpenChange={onOpenChange}
      shouldFilter
      loop
      overlayClassName="bo-system-overlay--soft fixed inset-0 z-[100]"
      contentClassName="bo-system-sheet bo-mobile-main fixed left-1/2 top-[10vh] z-[100] w-[min(100%-1.5rem,28rem)] -translate-x-1/2 overflow-hidden rounded-2xl border border-border/70 p-0 shadow-panel"
    >
      {commandBusy ? (
        <div
          className="flex items-center gap-2 border-b border-primary/25 bg-primarySoft/20 px-3 py-2"
          role="status"
          aria-live="polite"
          aria-atomic
        >
          <Loader2
            className="h-3.5 w-3.5 shrink-0 text-primary motion-safe:animate-spin"
            strokeWidth={2}
            aria-hidden
          />
          <p className="min-w-0 text-[10px] font-medium leading-snug text-text">
            Agent is working — you can still jump tabs; new commands queue after this run.
          </p>
        </div>
      ) : null}
      <div className="bo-command-palette-header border-b border-border/50 px-3 py-2.5">
        <div className="bo-brand-lockup">
          <BrandOpsMarkBadge className="bo-brand-mark--sm" />
          <div className="min-w-0">
            <p className="bo-brand-kicker">BrandOps</p>
            <p className="text-sm font-semibold leading-tight text-text">Command center</p>
            <p className="text-[10px] text-textMuted">Search, jump, or run a workspace command.</p>
          </div>
        </div>
        <Command.Input
          autoFocus
          disabled={commandBusy}
          placeholder="Type a command or tab name…"
          className={clsx(
            'mt-2.5 w-full rounded-lg border border-border/60 bg-bgSubtle/80 px-3 py-2 text-sm text-text',
            'placeholder:text-textSoft outline-none',
            'focus:border-borderStrong focus:ring-1 focus:ring-focusRing/80',
            btn
          )}
        />
      </div>
      <Command.List
        className="max-h-[min(50vh,22rem)] overflow-y-auto overscroll-contain p-2"
        label="Command results"
      >
        <Command.Empty className="px-2 py-6 text-center text-sm text-textMuted">
          No matches — try a tab name or “pipeline health”.
        </Command.Empty>

        <Command.Group
          value="go"
          forceMount
          heading={
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-textSoft">
              Go
            </span>
          }
        >
          {COMMAND_PALETTE_NAV_TARGETS.map((t) => {
            const Icon = t.Icon;
            return (
              <Command.Item
                key={t.tab}
                className={navItemClass}
                value={`open tab ${t.label} ${t.tab}`}
                keywords={[...t.keywords, t.label, t.tab, 'go', 'navigate']}
                onSelect={() => closeAnd(() => onNavigateTab(t.tab))}
              >
                <Icon className="h-4 w-4 shrink-0 text-textMuted" strokeWidth={2} aria-hidden />
                <span>{t.label}</span>
              </Command.Item>
            );
          })}
          <Command.Item
            className={navItemClass}
            value="open help knowledge"
            keywords={['help', 'knowledge', 'docs', 'learn']}
            onSelect={() => closeAnd(() => onOpenHelp())}
          >
            <BookOpen className="h-4 w-4 shrink-0 text-textMuted" strokeWidth={2} aria-hidden />
            <span>Help</span>
          </Command.Item>
        </Command.Group>

        <Command.Separator className="my-2 h-px bg-border/40" alwaysRender />

        {canExecuteAgentCommands ? (
          <>
            {CHAT_QUICK_STARTER_GROUPS.map((g, idx) => (
              <Command.Group
                key={g.id}
                value={`suggestions-${g.id}`}
                heading={
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-textSoft">
                    {idx === 0 ? <Sparkles className="h-3 w-3" aria-hidden /> : null}
                    {g.label}
                  </span>
                }
              >
                {g.commands.map((cmd) => (
                  <Command.Item
                    key={cmd}
                    className={cmdItemClass}
                    value={cmd}
                    disabled={agentDisabled}
                    onSelect={() => {
                      if (agentDisabled) return;
                      closeAnd(() => onRunCommand(cmd));
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate" title={cmd}>
                      {cmd}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
            <Command.Group
              value="suggestions-freeform"
              forceMount
              heading={<span className="sr-only">Run custom</span>}
            >
              <FreeformRunItem
                disabled={agentDisabled}
                onRun={(line) => {
                  if (agentDisabled) return;
                  closeAnd(() => onRunCommand(line));
                }}
              />
            </Command.Group>
          </>
        ) : (
          <Command.Group
            value="agent-locked"
            forceMount
            heading={
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-textSoft">
                <TriangleAlert className="h-3 w-3" aria-hidden />
                Agent
              </span>
            }
          >
            <div className="px-2 py-1.5 text-[11px] text-textMuted">{lockHint}</div>
          </Command.Group>
        )}

        {recent.length > 0 && canExecuteAgentCommands ? (
          <>
            <Command.Separator className="my-2 h-px bg-border/40" alwaysRender />
            <Command.Group
              value="history"
              forceMount
              heading={
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-textSoft">
                  <History className="h-3 w-3" aria-hidden />
                  Recent
                </span>
              }
            >
              {recent.map((cmd) => (
                <Command.Item
                  key={cmd}
                  className={cmdItemClass}
                  value={cmd}
                  disabled={agentDisabled}
                  onSelect={() => {
                    if (agentDisabled) return;
                    closeAnd(() => onRunCommand(cmd));
                  }}
                >
                  <span className="min-w-0 flex-1 truncate" title={cmd}>
                    {cmd}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          </>
        ) : null}
      </Command.List>
      <p className="border-t border-border/40 px-3 py-2 text-[10px] text-textSoft">
        <kbd className="rounded border border-border/60 bg-bgSubtle/80 px-1 font-mono">⌘K</kbd> or{' '}
        <kbd className="rounded border border-border/60 bg-bgSubtle/80 px-1 font-mono">Ctrl+K</kbd>{' '}
        to toggle
      </p>
    </Command.Dialog>
  );
};
