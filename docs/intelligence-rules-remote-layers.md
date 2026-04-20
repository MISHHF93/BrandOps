# Intelligence rules, policy layers, and remote deployment

This document inventories **defining rules** (deterministic scoring, thresholds, and guardrails) that shape BrandOps behavior today, and lays out how to **version**, **deploy**, and optionally **replace** them with remote bundles or model-backed services—similar in *ops* terms to shipping ML models (versioned artifacts, staged rollout, rollback), even when the payload is JSON rule packs rather than neural weights.

## 1. Terminology

| Term | Meaning |
|------|---------|
| **Rule pack** | Versioned JSON (or signed blob) of numeric thresholds and tunable coefficients consumed by client-side ranking and heuristics. |
| **Policy** | Hard guardrails (what providers are allowed, whether automation is on, etc.). Often changes less frequently than intelligence tuning. |
| **Model tier (future)** | Server or edge inference that outputs scores, labels, or structured plans; still gated by policy and validated before applying. |

## 2. Rule domains in the application today

These are the main **deterministic** rule surfaces (good candidates for remote packs or future model proxies).

### 2.1 Cockpit intelligence (`localIntelligence`)

- **Content priority**: base score, per-status bonuses, tag weight/cap, goal-keyword bonus.
- **Outreach urgency**: status bonuses, stale age threshold (hours), call-intent keyword bonus.
- **Overdue risk**: bucketed scores from hours-until-due (follow-ups and opportunities).
- **Pipeline health**: combines overdue risk with confidence multiplier, value divisor/cap, won/lost adjustments.
- **Publishing recommendations**: time windows (e.g. within 2h vs 24h) driving titles and rationale copy.
- **Template suggestions**: token overlap length threshold and result count.

**Implementation note:** Typed **`IntelligenceRulesPack`** (including **`heat`** / **`digest`**) merges from defaults + optional remote JSON; `localIntelligence`, `executionHeatModel`, and `dailyNotificationCenter` read **`getIntelligenceRules()`** at runtime.

### 2.2 Execution heat (`executionHeatModel`)

- Heat composition for follow-ups, outreach, publishing, pipeline (fixed point budgets, hour-based boosts, value curves).
- Managerial / technical notification heat from severity.

*Implemented:* coefficients live under **`heat`** on the intelligence rules pack (see `src/rules/`).

### 2.3 Daily execution digest (`dailyNotificationCenter`)

- Managerial vs technical weight split, max tasks, workday window scheduling.
- Depends on `localIntelligence.contentPriority` for technical actions.

*Partially implemented:* slice limits and hour windows are under **`digest`**; prompt template strings remain in workspace settings.

### 2.4 Cadence flow (`operatorCadenceFlow`)

- Mode presets (unit counts), block ordering, fallbacks when digest actions are empty.

*Roadmap:* preset tables as data-driven JSON.

### 2.5 AI “settings mode” (`aiSettingsMode`)

- Declarative operation kinds (set theme, cadence knobs, profile fields)—not generative LLM, but **rule-defined** mapping from parsed intent to workspace mutations.

*Roadmap:* optional remote allowlist of operation kinds and parameter clamps.

### 2.6 Runtime AI policy (`aiRuntimePolicy`)

- Which provider IDs are enabled, external API requirements, unsafe automation flags.

*Roadmap:* signed policy document for enterprise builds; distinct from intelligence scoring.

### 2.7 Storage normalization (`storage.ts`)

- Legacy field mapping, caps, fallbacks when importing old payloads.

*Roadmap:* keep client-side for offline integrity; only remote “rules” if you add server-side import.

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
2. **Merge, don’t replace** — Remote payload is a *partial patch* over defaults unless you explicitly ship a full snapshot with a higher `schemaVersion`.
3. **Validate and clamp** — Every numeric field bounded to safe ranges before use.
4. **Observe extension constraints** — Remote URLs must be allowed by MV3 host permissions and privacy policy if they touch user-derived signals.

---

## 4. Deployment mechanics (like “model releases”)

| Concern | Approach |
|---------|----------|
| **Versioning** | `schemaVersion` on the pack; client rejects unknown major versions. |
| **Rollout** | Host JSON at a stable URL; rotate content; optional `VITE_INTELLIGENCE_RULES_URL` for demos. |
| **Rollback** | Revert file on CDN or unset env → client falls back to defaults + optional static `/brandops-intelligence-rules.json`. |
| **Caching** | `cache: 'no-store'` on fetch during init (tune later with ETag). |
| **Integrity (later)** | Ed25519 signature over canonical JSON; public key in extension. |
| **Telemetry (later)** | Aggregate which pack version ran; no PII in v1. |

---

## 5. Environment and static files

| Source | Purpose |
|--------|---------|
| `INTELLIGENCE_RULES_DEFAULTS` in code | L1 baseline; always present. |
| `VITE_INTELLIGENCE_RULES_URL` | Optional absolute URL to a rule JSON (hosted preview, internal builds). |
| `/brandops-intelligence-rules.json` in `public/` | Optional local/preview override without rebuild (same pattern as `brandops-oauth-public.json`). |

Chrome Web Store builds should document any fixed hosts in `host_permissions` if you fetch cross-origin packs.

---

## 6. Security and privacy

- Rule packs should contain **coefficients and copy templates**, not user workspace data.
- If future tiers send **workspace excerpts** to a model API, that requires explicit consent, data minimization, and manifest disclosures.
- Signed packs recommended before enabling **unsigned** third-party URLs in production.

---

## 7. Phased implementation

| Phase | Scope |
|-------|--------|
| **Phase 1 (done in repo)** | `IntelligenceRulesPack` types, defaults mirroring current heuristics, merge+clamp, optional fetch, `localIntelligence` wired to `getIntelligenceRules()`, store `intelligenceRulesEpoch` to refresh dashboard after load. |
| **Phase 2 (done in repo)** | Nested **`heat`** and **`digest`** on the same pack: `executionHeatModel` + `ExecutionHeatMeter`/`CockpitOperatingBoard` bands and formulas; `dailyNotificationCenter` windows and slice limits. Same merge + `brandops-intelligence-rules.json` path. |
| **Phase 3** | Signed bundles + version compatibility matrix. |
| **Phase 4** | Optional inference API: client sends minimal features; server returns scores; client validates and maps to existing UI. |

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

| Area | Path |
|------|------|
| Types, merge, runtime | `src/rules/` (`intelligenceRulesTypes.ts`, `intelligenceRulesDefaults.ts`, …) |
| Heuristics consumer | `src/services/intelligence/localIntelligence.ts` |
| Heat + digest consumers | `src/pages/dashboard/executionHeatModel.ts`, `src/services/intelligence/dailyNotificationCenter.ts` |
| Load order | `src/state/useBrandOpsStore.ts` (`init`) |
| UI refresh | `src/pages/dashboard/dashboardApp.tsx` (memo deps on `intelligenceRulesEpoch`) |

## 10. Discoverability (deployed as product + docs)

- **README:** [Documentation (this repository)](../README.md#documentation-this-repository) links this file and the companion iconography guide.
- **In-app:** Help → Knowledge Center → **Optional intelligence tuning** summarizes behavior for operators; full layering detail stays in this markdown for contributors.

This plan is the contract for evolving BrandOps toward **data-driven intelligence** without sacrificing offline reliability or auditability of deterministic layers.
