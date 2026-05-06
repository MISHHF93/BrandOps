# AI action pipelines — JSON contract (`brandOpsActionPipeline`)

This document defines **machine-readable actions** the hosted Ask model may append so BrandOps can **execute real workspace work** (not just prose). It extends the existing v1 block (`brandOpsStructuredApply`) with **ordered multi-step pipelines**.

**Implementation:** [`src/services/ai/actionPipeline.ts`](../src/services/ai/actionPipeline.ts), [`src/services/ai/llmStructuredApply.ts`](../src/services/ai/llmStructuredApply.ts), shell hook in [`mobileApp.tsx`](../src/pages/mobile/mobileApp.tsx). Execution always goes through [`executeAgentWorkspaceCommand`](../src/services/agent/agentWorkspaceEngine.ts) + [`parseCommandRoute`](../src/services/agent/intent/commandIntent.ts).

---

## Why pipelines exist

- **v1** (`brandOpsStructuredApply`): one optional `executeAgentCommand` after an answer — good for a single read-only or safe mutation.
- **v2** (`brandOpsActionPipeline`): an **ordered list** of the same command strings — useful when the model plans “sense → then act → then log” without three separate user turns.

Safety is unchanged: **nothing runs** unless the active copilot worker’s **`allowedAgentCommands`** allow-list matches **every** command in the pipeline (normalized token match, same as v1).

---

## v2 schema (`brandOpsActionPipeline`)

Place **one JSON object** inside a fenced ` ```json ` block (recommended) or inline `{ ... }` anywhere in the model reply. The app parses the **first** JSON object using the same extractor as v1.

```json
{
  "brandOpsActionPipeline": {
    "version": 2,
    "id": "optional-correlation-string",
    "onError": "stop",
    "steps": [
      { "executeAgentCommand": "pipeline health" },
      { "executeAgentCommand": "add note: prioritized next steps from digest" }
    ]
  }
}
```

| Field | Required | Description |
|--------|-----------|-------------|
| `version` | yes | Must be `2` (number or string `"2"`). |
| `steps` | yes | Non-empty array. Each step is an object with **`executeAgentCommand`** (snake_case `execute_agent_command` also accepted). |
| `onError` | no | `stop` (default): abort after first failed step. `continue`: run remaining steps even if one fails. |
| `id` | no | Echo only for logs / future tracing; not used by the engine today. |

**Limits (enforced in code):**

- At most **12** steps.
- Each command: trimmed, **printable ASCII** only, max length **240** characters (same as v1).
- Destructive phrasing (e.g. archive) still follows existing UI confirmation gates when entered by the **user**; auto-run from Ask only executes allow-listed strings the worker is permitted to suggest.

---

## v1 schema (unchanged reference)

```json
{
  "brandOpsStructuredApply": {
    "version": 1,
    "executeAgentCommand": "pipeline health"
  }
}
```

If **both** `brandOpsActionPipeline` and `brandOpsStructuredApply` appear in the same root object, **v2 wins** when `version` is 2.

---

## Command strings

Commands are **exactly** the same natural-language lines users type in Assistant (see Knowledge Center → Commands). Examples: `pipeline health`, `add note: …`, `create follow up: …`, `draft post: …`, etc.

Workers should only emit strings that appear verbatim (modulo capitalization) on their **`allowedAgentCommands`** list (`domain.CopilotWorker`).

---

## Model authoring hints (system prompt)

Hosted Ask builds guidance in [`hostedAskTurn.ts`](../src/services/ai/hostedAskTurn.ts):

- If **`allowedAgentCommands` is empty** → tell the model **not** to emit automation JSON at all (prose only).
- If non-empty → show allowed tokens and optionally a **v2** example so multi-step plans can be expressed in one response.

---

## Future extensions (not implemented)

Document-only ideas to avoid schema churn later:

- **`navigate` steps** (e.g. open Plan / Today tab) — needs shell-side effect handler, not the storage agent.
- **`branch` / conditionals** — keep out of v2; use multiple user turns or server-side orchestration instead.
- **Idempotency keys** per step — tie to `id` + step index for retries.

---

## QA checklist

- Worker with allow-list containing `pipeline health` only → pipeline with a second disallowed command must **not** auto-run (parser may still parse; allow gate fails).
- Empty `steps` → ignored (`none`).
- Malformed JSON → treated as no automation; user still sees model prose.
- `onError: continue` → all steps invoked; chat summary lists each outcome.
