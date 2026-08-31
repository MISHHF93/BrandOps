import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import type { ExternalAgentEvent } from '../../types/agentInterop';
import { CONTEXT_BUNDLE_IDS } from '../../types/agentInterop';
import type { BrandOpsData } from '../../types/domain';
import { agentBridge } from '../../services/interop/agentBridge';
import { buildClaudeCodeMcpSnippet } from '../../services/interop/mcp/claudeConfig';
import { mobileChipClass, MOBILE_BTN_FOCUS } from './mobileTabPrimitives';

const chipDisabled = 'disabled:cursor-not-allowed disabled:opacity-50';

/** Capabilities granted to newly-created sessions. `action.request` stays OFF by default. */
const DEFAULT_GRANTED_CAPABILITIES = agentBridge
  .listCapabilities()
  .filter((cap) => cap.id !== 'action.request')
  .map((cap) => cap.id);

const EVENT_STATUS_LABEL: Record<ExternalAgentEvent['status'], string> = {
  proposed: 'proposed',
  reviewed: 'reviewed',
  verified: 'verified',
  rejected: 'rejected',
  promoted: 'promoted'
};

export interface ConnectedAgentsPanelProps {
  loadWorkspace: () => Promise<BrandOpsData>;
  applyWorkspace: (workspace: BrandOpsData) => Promise<void>;
  /** Download the current workspace JSON so the MCP gateway can authenticate this panel's token. */
  onExportWorkspace?: () => void | Promise<void>;
  btnFocus?: string;
}

/**
 * Connected Agents — review queue for the external-agent interop layer. Every
 * agent signal lands here as UNVERIFIED; nothing is ever auto-promoted to the
 * Twin. The user decides: verify, reject, promote, convert to Plan.
 */
export const ConnectedAgentsPanel = ({
  loadWorkspace,
  applyWorkspace,
  onExportWorkspace,
  btnFocus = MOBILE_BTN_FOCUS
}: ConnectedAgentsPanelProps) => {
  const [workspace, setWorkspace] = useState<BrandOpsData | null>(null);
  const [busy, setBusy] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'token' | 'mcp' | null>(null);

  const copyToClipboard = useCallback((label: 'token' | 'mcp', text: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
    void navigator.clipboard
      .writeText(text)
      .then(() => setCopied(label))
      .catch(() => {});
  }, []);

  const mcpSnippet = useMemo(() => {
    const tokenLine = createdToken ? createdToken : '<paste-token>';
    return buildClaudeCodeMcpSnippet(tokenLine);
  }, [createdToken]);

  const refresh = useCallback(async () => {
    setWorkspace(await loadWorkspace());
  }, [loadWorkspace]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const apply = useCallback(
    async (next: BrandOpsData) => {
      setBusy(true);
      setError(null);
      try {
        await applyWorkspace(next);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [applyWorkspace, refresh]
  );

  const counts = useMemo(() => (workspace ? agentBridge.counts(workspace) : null), [workspace]);
  const sessions = useMemo(
    () => (workspace ? agentBridge.listSessions(workspace) : []),
    [workspace]
  );
  const events = useMemo(() => (workspace ? agentBridge.listEvents(workspace) : []), [workspace]);
  const proposals = useMemo(
    () => (workspace ? agentBridge.listProposals(workspace) : []),
    [workspace]
  );
  const audit = useMemo(() => (workspace ? agentBridge.listAudit(workspace) : []), [workspace]);
  const tools = useMemo(() => agentBridge.listTools(), []);

  if (!workspace || !counts) {
    return (
      <div className="bo-mobile-sheet p-4 text-meta text-textMuted">Loading Connected Agents…</div>
    );
  }

  const createSession = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await agentBridge.createSession(workspace, {
        clientKind: 'claude-code',
        clientName: 'Claude Code',
        ownerUserId: 'local-user',
        workspaceId: 'local-workspace',
        grantedBundles: [...CONTEXT_BUNDLE_IDS],
        grantedCapabilities: [...DEFAULT_GRANTED_CAPABILITIES]
      });
      setCreatedToken(result.token);
      await apply(result.workspace);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const btn = (
    label: string,
    onClick: () => void,
    disabled = false,
    tone: 'default' | 'danger' = 'default'
  ) => (
    <button
      type="button"
      disabled={busy || disabled}
      onClick={onClick}
      className={clsx(
        mobileChipClass(btnFocus),
        chipDisabled,
        'shrink-0 px-3 py-1.5 text-fine',
        tone === 'danger' ? 'text-warning' : 'text-text'
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3" aria-label="Connected agents">
      {error ? <p className="text-fine text-warning">{error}</p> : null}

      <div className="flex flex-wrap gap-1.5 text-fine text-textMuted">
        <span className="rounded-md border border-border/40 bg-surface/45 px-2 py-1">
          {counts.activeSessions}/{counts.sessions} sessions active
        </span>
        <span className="rounded-md border border-border/40 bg-surface/45 px-2 py-1">
          {counts.unverifiedEvents} unverified signals
        </span>
        <span className="rounded-md border border-border/40 bg-surface/45 px-2 py-1">
          {counts.pendingProposals} proposals awaiting decision
        </span>
        <span className="rounded-md border border-border/40 bg-surface/45 px-2 py-1">
          {counts.auditEntries} audit rows
        </span>
      </div>

      <details className="bo-disclosure group" open={sessions.length > 0}>
        <summary
          className={`cursor-pointer list-none rounded-xl px-3 py-2.5 text-sm font-semibold text-text ${btnFocus} [&::-webkit-details-marker]:hidden`}
        >
          Sessions
          <span className="ml-2 text-meta font-normal text-textSoft">
            Authorized agent clients — each scoped to specific capabilities (read, propose, act)
          </span>
        </summary>
        <div className="space-y-3 border-t border-border/30 px-4 pb-4 pt-3">
          {sessions.length === 0 ? (
            <p className="text-meta text-textMuted">
              No sessions yet. Create one to authorize an agent — then connect it to send
              verified achievements or suggest twin updates.
            </p>
          ) : (
            <ul className="space-y-2">
              {sessions.map((session) => (
                <li
                  key={session.id}
                  className="rounded-lg border border-border/30 bg-surface/45 px-2 py-2 text-meta text-textMuted"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-text">
                        {session.clientName}{' '}
                        <span className="font-mono text-fine text-textSoft">
                          ({session.clientKind})
                        </span>
                      </p>
                      <p className="mt-0.5 text-fine text-textSoft">
                        {session.status} · {session.grantedCapabilities.length} capabilities ·{' '}
                        {session.grantedBundles.length} bundles
                      </p>
                    </div>
                    {session.status === 'active' ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void apply(agentBridge.revokeSession(workspace, session.id))}
                        className={clsx(
                          mobileChipClass(btnFocus),
                          chipDisabled,
                          'shrink-0 px-3 py-1.5 text-fine text-warning'
                        )}
                      >
                        Revoke
                      </button>
                    ) : (
                      <span className="text-fine text-textMuted">revoked</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {btn('Create session (Claude Code)', () => void createSession())}
            {createdToken ? (
              <button
                type="button"
                onClick={() => copyToClipboard('token', createdToken)}
                className={clsx(
                  mobileChipClass(btnFocus),
                  'shrink-0 px-3 py-1.5 text-fine text-info'
                )}
              >
                {copied === 'token' ? 'Copied token' : 'Copy token'}
              </button>
            ) : null}
            {onExportWorkspace ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void onExportWorkspace()}
                className={clsx(
                  mobileChipClass(btnFocus),
                  chipDisabled,
                  'shrink-0 px-3 py-1.5 text-fine text-primary'
                )}
              >
                Export workspace for agent
              </button>
            ) : null}
          </div>
          {createdToken ? (
            <p className="text-fine leading-snug text-textSoft">
              Token (shown once):{' '}
              <code className="break-all font-mono text-info">{createdToken}</code>. Use it as the
              session token. Hash is stored in the workspace; the raw token is not.
            </p>
          ) : null}
          {onExportWorkspace ? (
            <p className="text-fine leading-snug text-textSoft">
              The gateway authenticates your token against a workspace file. After creating a
              session, press{' '}
              <span className="font-semibold text-text">Export workspace for agent</span> and set the
              workspace file path below to the saved file — otherwise the token cannot resolve.
            </p>
          ) : null}
          <div className="rounded-lg border border-border/30 bg-surface/45 px-2 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-fine text-textSoft">
                Claude Code connect config — add this to your Claude settings and
                restart Claude Code.
              </p>
              <button
                type="button"
                onClick={() => copyToClipboard('mcp', mcpSnippet)}
                className={clsx(
                  mobileChipClass(btnFocus),
                  'shrink-0 px-3 py-1.5 text-fine text-info'
                )}
              >
                {copied === 'mcp' ? 'Copied config' : 'Copy config'}
              </button>
            </div>
            <pre className="mt-1.5 overflow-x-auto rounded-md border border-border/30 bg-black/40 px-2 py-1.5 font-mono text-fine leading-snug text-textSoft">
              {mcpSnippet}
            </pre>
          </div>
        </div>
      </details>

      <details
        className="bo-disclosure group"
        open={events.some((e) => e.status === 'proposed' || e.status === 'verified')}
      >
        <summary
          className={`cursor-pointer list-none rounded-xl px-3 py-2.5 text-sm font-semibold text-text ${btnFocus} [&::-webkit-details-marker]:hidden`}
        >
          Agent signals
          <span className="ml-2 text-meta font-normal text-textSoft">
            Signals from connected agents — review before entering the Twin
          </span>
        </summary>
        <div className="space-y-3 border-t border-border/30 px-4 pb-4 pt-3">
          {events.length === 0 ? (
            <p className="text-meta text-textMuted">
              No agent signals yet. Create a session, then have an agent send
              verified achievements or propose twin updates.
            </p>
          ) : (
            <ul className="space-y-2">
              {events.slice(0, 20).map((event) => (
                <li
                  key={event.id}
                  className="rounded-lg border border-border/30 bg-surface/45 px-2 py-2 text-meta text-textMuted"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-text">{event.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-fine leading-snug text-textSoft">
                        {event.detail}
                      </p>
                      <p className="mt-0.5 text-fine text-textMuted">
                        {event.kind} · {event.clientKind} · {EVENT_STATUS_LABEL[event.status]} ·{' '}
                        <span className="uppercase">{event.trustTier}</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {event.status === 'proposed' || event.status === 'reviewed' ? (
                      <>
                        {btn(
                          'Verify',
                          () =>
                            void apply(agentBridge.reviewEvent(workspace, event.id, 'verified')),
                          false,
                          'default'
                        )}
                        {btn(
                          'Reject',
                          () =>
                            void apply(
                              agentBridge.reviewEvent(
                                workspace,
                                event.id,
                                'rejected',
                                'Rejected in review queue.'
                              )
                            ),
                          false,
                          'danger'
                        )}
                      </>
                    ) : null}
                    {event.status === 'verified'
                      ? btn(
                          'Promote to Twin',
                          () => void apply(agentBridge.promoteEvent(workspace, event.id))
                        )
                      : null}
                    {event.status === 'verified' || event.status === 'promoted'
                      ? btn('Convert to Plan', () => {
                          const result = agentBridge.convertEventToPlan(workspace, event.id);
                          if (result) void apply(result.workspace);
                        })
                      : null}
                    {event.status === 'rejected' ? (
                      <span className="text-fine text-textMuted">closed</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      <details className="bo-disclosure group" open={proposals.some((p) => p.status === 'pending')}>
        <summary
          className={`cursor-pointer list-none rounded-xl px-3 py-2.5 text-sm font-semibold text-text ${btnFocus} [&::-webkit-details-marker]:hidden`}
        >
          Proposals
          <span className="ml-2 text-meta font-normal text-textSoft">
            Changes agents propose — never applied without your approval
          </span>
        </summary>
        <div className="space-y-3 border-t border-border/30 px-4 pb-4 pt-3">
          {proposals.length === 0 ? (
            <p className="text-meta text-textMuted">
              No proposals yet. Agents can propose twin updates, content ideas, or artifact changes
              — each one surfaces here for your review.
            </p>
          ) : (
            <ul className="space-y-2">
              {proposals.slice(0, 20).map((proposal) => (
                <li
                  key={proposal.id}
                  className="rounded-lg border border-border/30 bg-surface/45 px-2 py-2 text-meta text-textMuted"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-text">{proposal.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-fine leading-snug text-textSoft">
                      {proposal.detail}
                    </p>
                    <p className="mt-0.5 text-fine text-textMuted">
                      {proposal.kind} · {proposal.status}
                      {proposal.planId ? ` · plan: ${proposal.planId}` : ''}
                    </p>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {proposal.status === 'pending' ? (
                      <>
                        {btn(
                          'Approve',
                          () =>
                            void apply(
                              agentBridge.decideProposal(workspace, proposal.id, 'approved')
                            ),
                          false,
                          'default'
                        )}
                        {btn(
                          'Reject',
                          () =>
                            void apply(
                              agentBridge.decideProposal(workspace, proposal.id, 'rejected')
                            ),
                          false,
                          'danger'
                        )}
                      </>
                    ) : null}
                    {proposal.status === 'approved' && proposal.kind === 'content_opportunity'
                      ? btn('Convert to Plan', () => {
                          const result = agentBridge.convertProposalToPlan(workspace, proposal.id);
                          if (result) void apply(result.workspace);
                        })
                      : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      <details className="bo-disclosure group">
        <summary
          className={`cursor-pointer list-none rounded-xl px-3 py-2.5 text-sm font-semibold text-text ${btnFocus} [&::-webkit-details-marker]:hidden`}
        >
          Audit trail
          <span className="ml-2 text-meta font-normal text-textSoft">
            Every agent action, scoped by session and capability
          </span>
        </summary>
        <div className="space-y-2 border-t border-border/30 px-4 pb-4 pt-3">
          {audit.length === 0 ? (
            <p className="text-meta text-textMuted">No external-agent activity recorded.</p>
          ) : (
            <ul className="space-y-1.5">
              {audit.slice(0, 12).map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-lg border border-border/30 bg-surface/45 px-2 py-1.5 text-fine text-textMuted"
                >
                  <span
                    className={clsx(
                      'mr-1.5 font-semibold',
                      entry.ok ? 'text-success' : 'text-warning'
                    )}
                  >
                    {entry.ok ? 'ok' : 'fail'}
                  </span>
                  {entry.capabilityId} · {entry.operation} · {entry.summary}
                  <span className="block text-fine text-textSoft">
                    {new Date(entry.at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      <details className="bo-disclosure group">
        <summary
          className={`cursor-pointer list-none rounded-xl px-3 py-2.5 text-sm font-semibold text-text ${btnFocus} [&::-webkit-details-marker]:hidden`}
        >
          Agent capabilities
          <span className="ml-2 text-meta font-normal text-textSoft">
            {tools.length} capabilities let the agent read workspace context, propose achievements, create artifacts, and
            request approvals — scoped by session and capability tier
          </span>
        </summary>
        <div className="border-t border-border/30 px-4 pb-4 pt-3">
          <ul className="space-y-1.5">
            {tools.map((tool) => (
              <li
                key={tool.name}
                className="flex flex-col gap-0.5 rounded-lg border border-border/30 bg-surface/45 px-2 py-1.5 text-fine"
              >
                <span className="font-mono text-textSoft">{tool.name}</span>
                <span className="text-textMuted">{tool.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </div>
  );
};
