# Intelligence rules, policy layers, and remote deployment

This document inventories **defining rules** (deterministic scoring, thresholds, and guardrails) that shape BrandOps behavior today, and lays out how to **version**, **deploy**, and optionally **replace** them with remote bundles or model-backed services—similar in _ops_ terms to shipping ML models (versioned artifacts, staged rollout, rollback), even when the payload is JSON rule packs rather than neural weights.

## 1. Terminology

| Term                    | Meaning                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Rule pack**           | Versioned JSON (or signed blob) of numeric thresholds and tunable coefficients consumed by client-side ranking and heuristics.        |
| **Policy**              | Hard guardrails (what providers are allowed, whether automation is on, etc.). Often changes less frequently than intelligence tuning. |
| **Model tier (future)** | Server or edge inference that outputs scores, labels, or structured plans; still gated by policy and validated before applying.       |

## 2. Rule domains in the application today

These are the main **deterministic** rule surfaces (good candidates for remote packs or future model proxies).

### 2.1 Heuristic intelligence (`localIntelligence`)

- **Content priority**: base score, per-status bonuses, tag weight/cap, goal-keyword bonus.
- **Outreach urgency**: status bonuses, stale age threshold (hours), call-intent keyword bonus.
- **Overdue risk**: bucketed scores from hours-until-due (follow-ups and opportunities).
- **Pipeline health**: combines overdue risk with confidence multiplier, value divisor/cap, won/lost adjustments.
- **Publishing recommendations**: time windows (e.g. within 2h vs 24h) driving titles and rationale copy.
- **Template suggestions**: token overlap length threshold and result count.

**Implementation note:** Typed **`IntelligenceRulesPack`** (including **`heat`** / **`digest`**) merges from defaults + optional remote JSON. **`localIntelligence`** and **`dailyNotificationCenter`** read **`getIntelligenceRules()`** at runtime. **`initIntelligenceRulesFromRemote()`** must run to apply L2 overlays: it is invoked from the extension service worker on install/startup and from HTML entrypoints (`renderChatbotSurface`, `mobile/main`, `help/main`). Provenance (`getIntelligenceRulesLoadProvenance`) and a small coefficient readout are shown under **Settings → Intelligence rules (effective)** via `intelligenceRulesReadout` on the workspace snapshot. There is **no** `executionHeatModel` **source file** in `src/` after the chatbot migration; the former cockpit “execution heat” UI used these coefficients but is **not** in the current tree.

### 2.2 Execution heat (rule pack coefficients)

- Coefficients for follow-ups, outreach, publishing, and pipeline bands are defined on the pack under **`heat`** (see `src/rules/`) and merged with optional remote JSON.
- Managerial / technical “heat” in copy used to power cockpit meters; those React surfaces were removed in favor of **MobileApp** + **`localIntelligence.pipelineHealth`** and digests.

_Runtime today:_ the **`heat`** object is part of the merged pack and **exposed for tuning**, but `rg` shows **no** `getIntelligenceRules().heat` consumer in `src/services` yet; prefer **`localIntelligence`** outputs and **`dailyNotificationCenter`** for operator-facing signal until a new UI reads `heat` directly.

### 2.3 Daily execution digest (`dailyNotificationCenter`)

- Managerial vs technical weight split, max tasks, workday window scheduling.
- Depends on `localIntelligence.contentPriority` for technical actions.

_Partially implemented:_ slice limits and hour windows are under **`digest`**; prompt template strings remain in workspace settings.

### 2.4 Cadence flow (`operatorCadenceFlow`)

- Mode presets (unit counts), block ordering, fallbacks when digest actions are empty.

_Roadmap:_ preset tables as data-driven JSON.

### 2.5 AI “settings mode” (`aiSettingsMode`)

- Declarative operation kinds (set theme, cadence knobs, profile fields)—not generative LLM, but **rule-defined** mapping from parsed intent to workspace mutations.

_Roadmap:_ optional remote allowlist of operation kinds and parameter clamps.

### 2.6 Runtime AI policy (`aiRuntimePolicy`)

- Which provider IDs are enabled, external API requirements, unsafe automation flags.

_Roadmap:_ signed policy document for enterprise builds; distinct from intelligence scoring.

### 2.7 Storage normalization (`storage.ts`)

- Legacy field mapping, caps, fallbacks when importing old payloads.

_Roadmap:_ keep client-side for offline integrity; only remote “rules” if you add server-side import.

---

## 3. Layered architecture (target)

```
┌─────────────────────────────────────────────────────────────┐
│ L3 Optional inference API (future ML / ranking service)      │
│   Outputs scores or ranked IDs → validated → merged          │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS + auth
┌────────────────────────────▼────────────────────────────────┐
│ L2 Remote rule pack (versioned JSON)                         │
│   ETag / schemaVersion / min client version                 │
│   Fetched at init or on interval (policy-dependent)          │
└────────────────────────────┬────────────────────────────────┘
                             │ merge (patch over defaults)
┌────────────────────────────▼────────────────────────────────┐
│ L1 Embedded defaults (ship with extension)                   │
│   Always valid; offline-safe baseline                         │
└─────────────────────────────────────────────────────────────┘
```

**Principles**

1. **Defaults win offline** — No network required for a correct workspace.
2. **Merge, don’t replace** — Remote payload is a _partial patch_ over defaults unless you explicitly ship a full snapshot with a higher `schemaVersion`.
3. **Validate and clamp** — Every numeric field bounded to safe ranges before use.
4. **Observe extension constraints** — Remote URLs must be allowed by MV3 host permissions and privacy policy if they touch user-derived signals.

---

## 4. Deployment mechanics (like “model releases”)

| Concern               | Approach                                                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Versioning**        | `schemaVersion` on the pack; client rejects unknown major versions.                                                    |
| **Rollout**           | Host JSON at a stable URL; rotate content; optional `VITE_INTELLIGENCE_RULES_URL` for demos.                           |
| **Rollback**          | Revert file on CDN or unset env → client falls back to defaults + optional static `/brandops-intelligence-rules.json`. |
| **Caching**           | `cache: 'no-store'` on fetch during init (tune later with ETag).                                                       |
| **Integrity (later)** | Ed25519 signature over canonical JSON; public key in extension.                                                        |
| **Telemetry (later)** | Aggregate which pack version ran; no PII in v1.                                                                        |

---

## 5. Environment and static files

| Source                                           | Purpose                                                                                         |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `INTELLIGENCE_RULES_DEFAULTS` in code            | L1 baseline; always present.                                                                    |
| `VITE_INTELLIGENCE_RULES_URL`                    | Optional absolute URL to a rule JSON (hosted preview, internal builds).                         |
| `/brandops-intelligence-rules.json` in `public/` | Optional local/preview override without rebuild (same pattern as `brandops-oauth-public.json`). |

Chrome Web Store builds should document any fixed hosts in `host_permissions` if you fetch cross-origin packs.

---

## 6. Security and privacy

- Rule packs should contain **coefficients and copy templates**, not user workspace data.
- If future tiers send **workspace excerpts** to a model API, that requires explicit consent, data minimization, and manifest disclosures.
- Signed packs recommended before enabling **unsigned** third-party URLs in production.

---

## 7. Phased implementation

| Phase                               | Scope                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Phase 1 (done in repo)**          | `IntelligenceRulesPack` types, defaults, merge+clamp, optional fetch, `localIntelligence` wired to `getIntelligenceRules()`. (Legacy Zustand `intelligenceRulesEpoch` / dashboard refresh paths were **removed** with the chatbot migration.)                                                                                  |
| **Phase 2 (pack done; UI retired)** | Nested **`heat`** and **`digest`** on the same pack, merged like Phase 1. **`dailyNotificationCenter`** and slice limits are **live**. The **cockpit-only** `ExecutionHeatMeter` / `CockpitOperatingBoard` / `executionHeatModel` **modules are not in `src/`** anymore; do not treat Phase 2 as “a dashboard feature exists.” |
| **Phase 3**                         | Signed bundles + version compatibility matrix.                                                                                                                                                                                                                                                                                 |
| **Phase 4**                         | Optional inference API: client sends minimal features; server returns scores; client validates and maps to existing UI.                                                                                                                                                                                                        |

---

## 8. Example remote fragment

Consumers merge this shape over defaults (unknown keys ignored):

```json
{
  "schemaVersion": 1,
  "contentPriority": {
    "readyBonus": 42
  },
  "publishing": {
    "urgentWithinHours": 3
  }
}
```

See `public/brandops-intelligence-rules.example.json` for a fuller template.

---

## 9. Related source files

| Area                    | Path                                                                                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Types, merge, runtime   | `src/rules/` (`intelligenceRulesTypes.ts`, `intelligenceRulesDefaults.ts`, …)                                                                                           |
| Heuristics consumer     | `src/services/intelligence/localIntelligence.ts`                                                                                                                        |
| Heat + digest consumers | `src/services/intelligence/dailyNotificationCenter.ts` (and any callers that read `BrandOpsData`)                                                                       |
| Load order              | `src/services/storage/storage.ts` (workspace load / merge into `BrandOpsData`)                                                                                          |
| UI refresh              | Surfaces that read `storageService` or workspace snapshots (e.g. `src/pages/mobile/mobileApp.tsx`); there is no separate rules “epoch” store after the Zustand removal. |

## 10. Discoverability (deployed as product + docs)

- **README:** [Documentation (this repository)](../README.md#documentation-this-repository) links this file and the companion iconography guide.
- **In-app:** Help → Knowledge Center → **Optional intelligence tuning** summarizes behavior for operators; full layering detail stays in this markdown for contributors.

This plan is the contract for evolving BrandOps toward **data-driven intelligence** without sacrificing offline reliability or auditability of deterministic layers.
