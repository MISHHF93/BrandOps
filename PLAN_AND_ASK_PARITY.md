# Plan ⇄ Ask parity — actionable AI & artifacts

This pass aligns **Plan** (`workspace`) and **Ask / Assistant** (`chat`) so the same agent primitives are obvious, reachable, and correctly traced—without duplicating business logic.

## Shared execution spine (already true)

| Capability | Entry | Code |
|-------------|-------|------|
| On-device workspace commands | Plan tiles, ⌘K, Assistant starters / composer | `executeAgentWorkspaceCommand` via `runAgentQuick`; Plan uses `sendQuickCommandFrom('Workspace', { navigateToChat: false })` and palette `paletteOnRunCommand` so the tab can stay on Plan |
| Hosted answers | `ask:` prefix | `runChatCompletion` + `buildHostedAskMessages` |
| Model → auto command | Structured JSON (`brandOpsStructuredApply`, `brandOpsActionPipeline`) | `parseAiExecutablePayload`, `llmStructuredApply` + `actionPipeline`; allow-list |
| NLP trace artifact | Hosted round-trips | `persistChatGatewayTrace` |
| Transcript persistence | Reload | `CHAT_THREAD_KEY`, `normalizeStoredMessage` (incl. `ask-result`, `command-result`) |
| Recent command chips | Plan palette + Assistant | `COMMAND_CHIPS_KEY` |

## Gaps addressed in this iteration

1. **Assistant lacked an explicit ⌘K affordance** while Plan surfaced “All commands ⌘K”. → Add matching control on Ask.
2. **Plan’s essentials grid wasn’t surfaced on Ask** beyond six rotated starters → Add **Planning picks** strip = first essentials from same catalog as Plan (`getIntentsForPlanPage`), deduped against starter lines.
3. **No in-page anchors on Ask** (Plan has jump links) → Add `assistant-copilot`, `assistant-commands`, `assistant-thread` + compact jump nav.
4. **Copilot copy didn’t mention pipeline JSON** → One line tying hosted replies to allowed automation JSON.
5. **Documentation drift** → This file + pointers in `PLAN_SURFACE_COVERAGE.md`.

## Out of scope

- Changing agent routing semantics or OAuth flows.
- Duplicating full Plan tile grid inside Assistant (density); **shortcuts only**.

## Acceptance

- From Assistant, user can open the **same command palette** as Plan without memorizing ⌘K.
- At least four **Planning** intents visible that match Plan essentials ordering (excluding duplicates already in starters).
- SSR landmarks for new ids / controls pass tests.
