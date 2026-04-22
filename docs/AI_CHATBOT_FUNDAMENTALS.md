# AI chatbot fundamentals (BrandOps)

This document maps **common chatbot building blocks** to how BrandOps implements them today.

## What people usually mean by “AI chatbot”

A chatbot, in the product sense, is:

1. **Conversational surface** — a thread where the user and the system take turns.
2. **Intent handling** — the system infers *what* the user wants from text (rules, model, or both).
3. **Execution** — something happens in the product (read/write state, call APIs, return an answer).
4. **Memory** — short-term (the thread) and longer-term (profile, workspace data).
5. **Feedback** — the user sees outcomes, errors, and progress clearly.

A product can be a strong “agent” without a large language model (LLM) on every turn: **deterministic routing + transparent execution** is a valid and often safer baseline.

## How BrandOps maps to those fundamentals

| Building block | BrandOps implementation |
|----------------|-------------------------|
| Conversational surface | [`MobileApp`](../src/pages/mobile/mobileApp.tsx) (Chat tab), persisted thread in `localStorage` |
| Intent handling (v1) | **Deterministic** route map: [`src/services/agent/intent/commandIntent.ts`](../src/services/agent/intent/commandIntent.ts) |
| Execution | **Single command engine**: [`executeAgentWorkspaceCommand`](../src/services/agent/agentWorkspaceEngine.ts) (notes, publishing, CRM, content, config, channels, etc.) |
| Long-term memory | Workspace: [`src/services/storage/storage.ts`](../src/services/storage/storage.ts) (`BrandOpsData`) |
| Thread memory | Client-side chat history + “recent command” chips in `MobileApp` |
| Feedback | Structured `AgentWorkspaceResult` (`ok`, `action`, `summary`); **audit** on `BrandOpsData.agentAudit` |
| Multi-channel input | Service worker: [`src/background/index.ts`](../src/background/index.ts); proxy: [`scripts/bridge-proxy.mjs`](../scripts/bridge-proxy.mjs) |
| Optional LLM | [`src/services/llm/providerAdapter.ts`](../src/services/llm/providerAdapter.ts) — **not** the primary path for workspace mutations; command execution is authoritative for state changes. |

## Command-first “agent” vs free-form LLM chat

- **Command-first (current default):** user text is routed to a known action, applied to local workspace data, and summarized. Predictable, auditable, local-first.
- **LLM-assisted (optional / future):** can help rephrase, suggest next steps, or interpret ambiguous phrasing, but should not silently override the engine without explicit product rules.

## Relationship to the migration plan

See [../AI_CHATBOT_FULL_MIGRATION_PLAN.md](../AI_CHATBOT_FULL_MIGRATION_PLAN.md) for milestone status. Completed items include deterministic routing, engine coverage, channel bridge hardening, audit log, and chatbot UX productization. Optional follow-ups include deeper LLM intent parsing and retiring unused legacy module UIs when product confirms.

## Reading order for engineers

1. [AI_CHATBOT_FUNDAMENTALS.md](./AI_CHATBOT_FUNDAMENTALS.md) (this file)  
2. [APPLICATION_WIRING_STATUS.md](../APPLICATION_WIRING_STATUS.md)  
3. [AI_CHATBOT_FULL_MIGRATION_PLAN.md](../AI_CHATBOT_FULL_MIGRATION_PLAN.md)  
