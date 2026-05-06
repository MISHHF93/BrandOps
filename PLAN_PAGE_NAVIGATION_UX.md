# Plan page — navigation & command routing (rebuild spec)

## Problem statement

On the mobile shell, the **Plan** tab (`MobileWorkspaceHubView`, `activeTab === 'workspace'`) felt “broken”: tapping **planning actions**, **Pipeline health**, **queue actions**, or running a line from **⌘K** appeared to “always open Ask/Assistant.” Users could not reliably stay on Plan to use **Settings** or **Integrations** shortcuts, or to run commands and read the page.

## Root cause (verified in code)

Command execution from Plan did **not** differ from “run from Chat” at the navigation layer:

1. **`sendQuickCommandFrom('Workspace')`** (passed as `runCommand` to the Plan hub) always executed:
   - `commitTab('chat')`
   - `setInput('')`
   - then `startSend(trimmed, 'Workspace')` in a microtask.

   So every Plan tile that called `runCommand(...)` **forced a tab switch to Assistant** before the agent ran.

2. **Global command palette** used `onRunCommand={runCommand}` where `runCommand` is an alias of **`sendQuickCommand`**, which also **always** calls `commitTab('chat')`. Opening ⌘K from Plan and running a command therefore jumped to Ask as well.

3. **Queue table** used **`primeChat(line)`**, which only does `commitTab('chat')` + `setInput(line)` — intentional “continue in Assistant,” but the button was labeled **Chat**, which read like the only action and reinforced the idea that “everything goes to Ask.”

4. **Destructive confirm** (`pendingDestructive`) called `executeCommandFlow(cmd)` with **no source surface**, defaulting transcript attribution to **`Chat`** even when the command was queued from Plan.

None of this required changing the agent engine (`executeAgentWorkspaceCommand`, `executeCommandFlow`); it was **shell routing and copy** only.

## Design goals

| Goal | Detail |
|------|--------|
| **Stay on Plan** | Workspace commands triggered from Plan (tiles, planning grid, queue primary action, ⌘K while Plan is active) run **without** switching to the Ask tab. |
| **Explicit Ask** | Only **clearly labeled** controls (e.g. “Open Assistant”) navigate to `chat`. |
| **Same execution** | Still one pipeline: `startSend` → `executeCommandFlow` → messages + snapshot refresh. Transcript updates in the background; users can open Ask when they want the thread. |
| **Honest palette copy** | When Plan is active, palette primary line reads **Run from Plan** (not “Run in Chat”); footer explains stay-on-Plan behavior. |
| **Queue semantics** | Primary control **Run** executes the row’s command **on Plan**; optional future: secondary “Prefill Assistant” if we need both. |
| **Destructive parity** | Confirm dialog runs with the **same** `sourceSurface` that was used when the command was queued. |

## Information architecture (Plan only)

Recommended **shortcut row** order and semantics (implemented in the hub):

1. **Integrations** — `commitTab('integrations')` (in place).
2. **Settings** — `commitTab('settings')` (in place).
3. **Assistant** — `commitTab('chat')` (explicit leave Plan; visual + copy distinction).

Supporting copy (hero or shortcut footnote): **Integrations and Settings open here. Assistant opens the Ask tab.**

Jump links (`PlanJumpNav`), **Today** destination card, **Pulse** (`WorkspaceSignalsBoard`), and **Today snapshot** remain non-chat unless they explicitly call chat (they should not).

## Technical contract

### New behavior: `runAgentQuick(command, source, navigateToChat)`

Central helper in `mobileApp.tsx`:

- **`source === 'Workspace'`** and **`navigateToChat === false`**:
  - Do **not** call `commitTab('chat')`.
  - Do **not** clear composer input (user may have a draft on Ask from a prior visit).
  - Set a short **`dataOpsHint`** such as: *Running from Plan… Open Assistant for the transcript.*
- **All other** `(source, navigateToChat)` combinations match previous behavior: switch to Chat and run (Today, Integrations, Settings, Chat, or Workspace with `navigateToChat true`).

### Plan hub wiring

- `runCommand={sendQuickCommandFrom('Workspace', { navigateToChat: false })}`
- Queue row: `onClick={() => runCommand(workspaceQueueCommandLine(row))}` with label **Run** (not “Chat”).
- Remove **`primeChat`** from Plan hub props if unused.

### Palette wiring

- When `activeTab === 'workspace'`, `onRunCommand` delegates to `runAgentQuick(cmd, 'Workspace', false)`.
- Otherwise keep `sendQuickCommand(cmd)` (jump to Chat).

### Destructive confirmation

- State shape: `{ command: string; sourceSurface: AgentCommandSourceSurface } | null`.
- `startSend` stores both when `needsDestructiveConfirm`.
- Confirm button: `executeCommandFlow(pending.command, pending.sourceSurface)`.

## Testing & acceptance

- [ ] From Plan, tap **Sync embeddings** (or any planning tile): **tab stays Plan**; header hint appears; snapshot can refresh.
- [ ] From Plan, **⌘K** → run a command: **stay on Plan**; palette footer matches.
- [ ] From Plan, tap **Settings** / **Integrations**: **no** jump to Ask.
- [ ] From Plan, tap **Assistant** shortcut: **opens Ask** (expected).
- [ ] From **Today** tab, run command: still **jumps to Chat** (unchanged product choice).
- [ ] Destructive command from Plan: confirm runs with **`Workspace`** source on the user message / flow where applicable.
- [ ] `npm run build` and relevant **vitest** suites pass.

## Out of scope (this pass)

- Rebuilding **Today**, **Integrations**, or **Settings** navigation.
- Inline command results on Plan (toasts beyond `dataOpsHint`, progress bars, etc.).
- Changing **bottom dock** semantics (Ask vs Plan).

## Related docs

- [`PLAN_AND_ASK_PARITY.md`](./PLAN_AND_ASK_PARITY.md) — shared agent spine and Assistant parity.
- [`PLAN_SURFACE_COVERAGE.md`](./PLAN_SURFACE_COVERAGE.md) — Plan surface inventory (update routing row after this landing).
