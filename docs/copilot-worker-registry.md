# Copilot worker registry — design note

This document merges **what exists in source today** with a **first-class worker registry** direction: multiple named copilots whose personas and constraints come from owner-defined inputs, without forking the workspace model.

It is a specification for implementation; it does not replace code comments or [`nlpCapabilityManifest.ts`](../src/services/ai/nlpCapabilityManifest.ts).

---

## 1. What exists today (ground truth)

### 1.1 Single workspace, multiple surfaces

- Persisted document: **`BrandOpsData`** ([`src/types/domain.ts`](../src/types/domain.ts)), normalized on read/write in [`src/services/storage/storage.ts`](../src/services/storage/storage.ts).
- **Mobile shell** ([`src/pages/mobile/mobileApp.tsx`](../src/pages/mobile/mobileApp.tsx)): cockpit, Assistant chat, Integrations, Settings — all share the same storage and agent engine.
- **Deterministic commands**: [`executeAgentWorkspaceCommand`](../src/services/agent/agentWorkspaceEngine.ts) + [`parseCommandRoute`](../src/services/agent/intent/commandIntent.ts).

### 1.2 Hosted NLP (“Ask”)

- User prefix **`ask:`** routes to **`runChatCompletion`** ([`nlpInferenceGateway.ts`](../src/services/ai/nlpInferenceGateway.ts)).
- System + workspace context are assembled in [`hostedAskTurn.ts`](../src/services/ai/hostedAskTurn.ts) (`buildHostedAskMessages`). Today the **persona is fixed** in `ASK_SYSTEM_PREFIX` (BrandOps Assistant).
- Policy: **`settings.aiAdapterMode === 'external-opt-in'`**, **`aiRuntimePolicy.externalNlpHttpEnabled`**, **`settings.aiBridge`** URLs + model IDs; API key in extension storage ([`aiSecretsAccess.ts`](../src/services/ai/aiSecretsAccess.ts)).

### 1.3 Owner-provided “AI flavor” already in settings

**`NotificationCenterSettings`** ([`domain.ts`](../src/types/domain.ts)) already carries fields that behave like **global** guidance:

| Field | Role |
|--------|------|
| `roleContext` | Long-form operator / brand role description |
| `promptTemplate` | Default strategic prompt scaffold (“you are BrandOps…”) |
| `preferredModel` | Label string (not yet wired as override for `aiBridge.chatModelId` in Ask path) |
| `aiGuidanceMode` | `rule-based` \| `prompt-ready` \| `hybrid` |

These are **workspace-wide**, not per-copilot. The worker registry should **compose with** them (e.g. default inheritance), not duplicate them blindly.

### 1.4 Structured actions from the model

- [`llmStructuredApply.ts`](../src/services/ai/llmStructuredApply.ts): `brandOpsStructuredApply` v1, optional `executeAgentCommand`.
- **Auto-exec allow-list** is intentionally narrow (e.g. `pipeline health`). Workers should map to **explicit allow-lists per persona**, not open-ended shell.

### 1.5 Embeddings and “artifacts”

- **Content library + embedding index**: `BrandOpsData.embeddingIndex` ([`domain.ts`](../src/types/domain.ts)), pipeline [`contentEmbeddingsPipeline.ts`](../src/services/ai/contentEmbeddingsPipeline.ts), command phrases like “sync content embeddings”.
- **Integration hub artifacts** (`integrationHub.artifacts` etc.) are first-class workspace data — workers can reference them in prompts once retrieval/context builders exist.

### 1.6 Observability

- Gateway traces: [`aiGatewayTracing.ts`](../src/services/ai/aiGatewayTracing.ts) (`ai.gateway.chat`, `ai.gateway.embeddings`).
- Operator traces respect **`operatorTraceCollectionEnabled`**.

---

## 2. Goal: first-class worker registry

**Workers** are named copilots with:

- **Identity**: id, display name, short description (owner-visible).
- **Persona**: system-layer instructions (tone, expertise, boundaries).
- **Inputs / artifacts scope**: what workspace slices the model may assume as context (e.g. brand vault, content library tags, integration artifact kinds).
- **Capabilities**: which deterministic commands may be suggested or auto-run (subset of allow-list).
- **Model overrides (optional)**: per-worker `chatModelId` / temperature caps — falling back to `settings.aiBridge`.

The **owner reframes** behavior by editing worker definitions (and picking an active worker in UI), not by rewriting code.

---

## 3. Proposed data model (sketch)

Place under **`AppSettings`** (versioned + normalized like `aiBridge`) to avoid a second persistence root:

```typescript
// Illustrative — finalize in domain.ts + workspaceDefaults + storage normalization

interface CopilotWorker {
  id: string;                    // stable slug, e.g. "pipeline-coach"
  name: string;                  // display
  description?: string;
  /** Appended after global NotificationCenter roleContext / prompt hooks */
  systemInstructions: string;
  /** Optional: topics, tags, artifact kinds to bias retrieval (future) */
  contextHints?: {
    contentTags?: string[];
    integrationArtifactKinds?: string[];
    includeBrandVault?: boolean;
  };
  /** Ids or patterns allowed for structured JSON suggestions / auto-exec */
  allowedAgentCommands?: readonly string[]; // strict allow-list
  /** Optional overrides */
  chatModelId?: string;
  maxCompletionTokens?: number;
}

interface CopilotWorkerRegistrySettings {
  workers: CopilotWorker[];
  /** Must match workers[].id */
  activeWorkerId: string | null;
}
```

**Inheritance rule (recommended):**

1. Global: `notificationCenter.roleContext` + `promptTemplate` (trimmed) as baseline.
2. Worker: `systemInstructions` + `contextHints` layered on top.
3. Gateway: `runChatCompletion` uses `worker.chatModelId ?? settings.aiBridge.chatModelId`.

**Limits**: cap count of workers, string lengths, and allow-list size in **`storage.ts`** normalization (same pattern as `aiBridge` URL caps).

---

## 4. Behavior changes

### 4.1 `buildHostedAskMessages`

- Accept **`activeWorker: CopilotWorker | null`** (or resolved profile).
- Replace sole `ASK_SYSTEM_PREFIX` with:

  `globalBaseline + worker.systemInstructions + structured-json rules + allow-list copy`

- Inject **worker id** into trace metadata (extend `persistChatGatewayTrace` details with `workerId`).

### 4.2 Structured apply + allow-list

- Today: global functions [`isAllowedAutoExecuteAiCommand`](../src/services/ai/llmStructuredApply.ts).
- Target: **`isAllowedForWorker(worker, suggestedCommand)`** so each worker declares safe automation (still conservative).

### 4.3 UI (mobile Assistant)

- **Worker picker**: chips or select above composer (persist `activeWorkerId`).
- **Optional**: prefix remains `ask:` for hosted turn; worker choice affects system prompt only.
- Settings: minimal CRUD for workers (name, instructions, allow-list presets) — can start read-only list + picker using seeded defaults.

### 4.4 “Artifacts → models”

This doc distinguishes:

| Meaning | Implementation |
|---------|----------------|
| **Logical model** (persona + rules) | Worker registry + prompts |
| **Embedding vectors** | Existing `embeddingIndex` + sync command |
| **Foundation LLM** | `aiBridge` + optional per-worker override |

“Building models from artifacts” in product language = **grounding**: future step selects chunks from content library / integration hub using `contextHints`, then injects into context or uses RAG — **not** training weights in-repo.

---

## 5. Phased rollout

| Phase | Deliverable |
|-------|-------------|
| **A** | Types + defaults + normalization + `activeWorkerId` persistence |
| **B** | Wire `buildHostedAskMessages` + traces with `workerId` |
| **C** | Mobile worker picker + Settings readout rows |
| **D** | Per-worker allow-list for structured JSON |
| **E** | Retrieval: tag/kind filters → context blocks (optional) |

Update [`nlpCapabilityManifest.ts`](../src/services/ai/nlpCapabilityManifest.ts) when each phase lands.

---

## 6. Related docs

- [AI bridge providers](./ai-bridge-providers.md) — URLs, keys, `ask:` usage.

---

## 7. Open decisions

- **Cap workers**: max N (e.g. 8) to protect storage and UX.
- **Sync vs async**: worker edits apply immediately on next `ask:` turn (simplest).
- **Telemetry**: export traces including `workerId` for annotation pipelines.
- **Cross-surface parity**: extension / web chat surfaces should read the same `activeWorkerId` when added.

---

*Last aligned with codebase discussion: worker registry as persona + capability layer on existing `BrandOpsData`, Ask gateway, structured apply, embeddings index, and integration hub data.*

---

## 8. Implementation status (shipped)

- **Schema**: `CopilotWorker`, `CopilotWorkerRegistrySettings`, and `AppSettings.copilotWorkers` in [`src/types/domain.ts`](../src/types/domain.ts); defaults in [`src/config/copilotWorkerDefaults.ts`](../src/config/copilotWorkerDefaults.ts); normalization caps in [`src/services/storage/storage.ts`](../src/services/storage/storage.ts).
- **Ask composition**: [`hostedAskTurn.ts`](../src/services/ai/hostedAskTurn.ts) + [`copilotWorkers.ts`](../src/services/ai/copilotWorkers.ts) (resolve + Phase E context hints).
- **Safety**: [`isAllowedForWorker`](../src/services/ai/llmStructuredApply.ts) gates structured auto-exec; traces record `workerId` via [`aiGatewayTracing.ts`](../src/services/ai/aiGatewayTracing.ts).
- **UI**: Assistant copilot chips in [`MobileChatView.tsx`](../src/pages/mobile/MobileChatView.tsx); Settings readout rows; snapshot exposes `copilotWorkerRegistry`.
