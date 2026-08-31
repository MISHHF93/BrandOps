# BrandOps Configuration Readiness Report

**Date:** 2026-08-19  
**Status:** Evidence-driven audit + recommended control-plane additions  
**Method:** Inspect source → classify config surfaces → identify contradictions, duplication, unused values, insecure defaults, hard-coded thresholds → recommend registry, precedence, concept separation, feature-flag/experiment abstraction, org profile, baselines, business-hours semantics.

This report is grounded in the repository as it exists today. It does not invent config surfaces; it classifies the ones that are present and marks the ones that are described but not yet persisted/resolved as **GAP / UNVERIFIED**.

> **CORRECTION BANNER (2026-08-31):** The `normalizers/` tree under `src/services/storage/` (e.g. `settings.ts`, `crm.ts`) referenced in the original was **DELETED** in a later dead-code-removal workstream. Settings/CRM normalization now lives inline in `src/services/storage/storage.ts` / `withDefaults`, and the constants (MAX_*, etc.) are now defined there. The constants and behavior described remain valid; only the file path changed. Any "duplication between storage.ts and normalizers/*" note is **obsolete and resolved**.

---

## 1) Configuration inventory — classification

### Build-time
| Surface | Where | Notes |
|---|---|---|
| `vite.config.ts` | `/` | Build packaging config |
| `tailwind.config.cjs` | `/` | Design-token/class config |
| `public/` manifest assets | `/` | Extension icons, branding |
| `src/vite-env.d.ts` | `src/` | `VITE_*` env type declarations |

### Deployment / environment
| Surface | Where | Notes |
|---|---|---|
| `.env.development` | `/` | Dev overrides |
| `.env.example` | `/` | Template |
| `VITE_PRIVACY_POLICY_URL` | `src/vite-env.d.ts`, `src/shared/config/privacyPolicyUrl.ts` | BUILD_TIME/DEPLOYMENT bridge |
| `VITE_PUBLIC_ORIGIN` | `src/vite-env.d.ts` | Build-time origin for OG/Twitter images |
| `VITE_ENFORCE_MEMBERSHIP_GATE` | `src/shared/account/launchLifecycleGate.ts` | Dev-only membership gate, env-gated |
| `VITE_STRIPE_CHECKOUT_URL` | `src/pages/mobile/mobileApp.tsx` | Billing portal nav link (not verified billing) |
| `VITE_STRIPE_BILLING_PORTAL_URL` | `src/pages/mobile/mobileApp.tsx` | Billing portal nav link |
| `VITE_SKIP_LAUNCH_AUTH` | `src/shared/account/launchLifecycleGate.ts` | Dev-only launch auth skip |
| `VITE_INTELLIGENCE_RULES_URL` | `src/rules/intelligenceRulesRuntime.ts` | Optional remote partial intelligence rules fetch |

### Platform / seeded defaults
| Surface | Where | Notes |
|---|---|---|
| `defaultAiBridgeSettings` | `src/config/workspaceDefaults.ts` | Default inference + embedding base URLs, model ids |
| `defaultBrandProfile` | `src/config/workspaceDefaults.ts` | Production-empty brand defaults |
| `defaultAppSettings` | `src/config/workspaceDefaults.ts` | Canonical production-empty settings defaults |
| `defaultCopilotWorkerRegistry` | `src/config/copilotWorkerDefaults.ts` | Seeded copilot workers |
| `OPERATING_PRESETS` | `src/shared/workspace/operatingProfileCatalog.ts` | Operating profile presets |
| Seed data (`seed.ts`, `demoSeed.ts`) | `src/modules/brandMemory/` | Workspace seed content |
| `cockpitCapabilities` | `src/shared/config/capabilityMap.ts` | Capability → tab mapping |
| `workspaceModules` | `src/shared/config/modules.ts` | Module → surface mapping |
| `dashboardNavigation.ts` | `src/shared/config/` | Section/area config used by Today + Plan |

### Persisted user/settings surface (today’s real config)
From `src/types/domain.ts` → `AppSettings`, normalized in `src/services/storage/storage.ts` (via `withDefaults`; the former `normalizers/settings.ts` path was deleted — see banner):

1. `timezone`
2. `defaultReminderLeadHours`
3. `weekStartsOn`
4. `theme`
5. `cockpitLayout`
6. `cockpitDensity`
7. `localModelEnabled`
8. `aiAdapterMode`
9. `debugMode`
10. `operatorTraceCollectionEnabled`
11. `connectedIdentityLearningEnabled`
12. `primaryIdentityProvider`
13. `overlay`
14. `automationRules[]`
15. `syncHub`
16. `notificationCenter`
17. `operatorTwin`
18. `cadenceFlow`
19. `aiBridge`
20. `copilotWorkers`
21. `operatingProfile`
22. `aiOperatorMode`
23. `aiRoutingDiagnosticsEnabled`

### AI configuration surfaces
| Surface | Where | Notes |
|---|---|---|
| `AiOperatorMode` | `src/types/aiIntegrationSuite.ts` | Operator-facing routing stance |
| `AITaskType`, `AIModelCapability` | `src/types/aiIntegrationSuite.ts` | Task taxonomy + model capability scores |
| `AIRoutingPolicy` | `src/types/aiIntegrationSuite.ts`, `src/services/ai/aiAskRouting.ts` | Mode → task routing recipes |
| `inferCapabilityFromModelId` | `src/services/ai/aiAskRouting.ts` | Heuristic model capability inference |
| `HostedAssistantRoutingResolution` | `src/services/ai/aiAskRouting.ts` | Routing decision shape |
| `AIPipeline`, `PipelineRun` | `src/types/aiIntegrationSuite.ts` | Declarative pipeline shapes |
| AI Core (`brandOpsAiCore.ts`) | `src/services/ai/` | Artifact synthesis, approval gating, budgets/constants |
| `actionPipeline.ts` | `src/services/ai/` | `MAX_ACTION_PIPELINE_STEPS`, `MAX_STRUCTURED_AGENT_COMMAND_CHARS` |
| `aiAssistantTraceLog.ts` | `src/services/ai/` | `MAX_AI_ASSISTANT_TURN_TRACES`, `MAX_PREVIEW_CHARS` |
| `aiEndpointAccess.ts`, `aiSetupState.ts`, `aiSettingsMode.ts` | `src/services/ai/` | Endpoint + mode state |

### Action execution / approvals / checkpoints
| Surface | Where | Notes |
|---|---|---|
| `planExecutor.ts` | `src/services/execution/` | Execution recording only; external actions blocked |
| `planVerifier.ts` | `src/services/execution/` | Outcome verification + twin learning mirror |
| `planStore.ts` | `src/services/execution/` | Plan status single source of truth |
| `checkpointStore.ts` | `src/services/execution/` | `MAX_CHECKPOINT_ENTRIES`, `MAX_SUMMARY_LEN`, `MAX_ID_LEN` |
| `checkpointActions.ts` | `src/services/execution/` | Approve/reject fan-out |
| `EXTERNAL_ACTION_MARKERS` | `src/services/execution/planExecutor.ts` | String list driving external-action detection |

### Intelligence / attention / scoring
| Surface | Where | Notes |
|---|---|---|
| `intelligenceRulesTypes.ts` | `src/rules/` | Schema version + pack types |
| `intelligenceRulesDefaults.ts` | `src/rules/` | L1 scoring defaults |
| `intelligenceRulesRuntime.ts` | `src/rules/` | In-memory rules + provenance |
| `mergeIntelligenceRules.ts` | `src/rules/` | Validation/clamp merge of remote partials |
| `localIntelligence.ts` | `src/services/intelligence/` | Content priority, opportunity health, follow-up heat |
| `dailyNotificationCenter.ts` | `src/services/intelligence/` | Daily brief digest |
| `operatorCadenceFlow.ts` | `src/services/intelligence/` | Cadence block scheduling |

### Connector / integration surfaces
| Surface | Where | Notes |
|---|---|---|
| `IntegrationSourceKind`, `IntegrationSource`, `ExternalArtifactRecord`, `IntegrationHubState`, `SshTarget` | `src/types/domain.ts` | Connector metadata shapes |
| `integrationSourceCatalog.ts` | `src/shared/integrations/` | Source presets + kinds |
| `capabilityRegistry.ts` | `src/services/interop/` | Agent capability definitions |
| `crm.ts` (normalizer — DELETED; see banner) | ~~`src/services/storage/normalizers/`~~ → now inline in `storage.ts` | Partial CRM normalization |

### Security / auth / session surfaces
| Surface | Where | Notes |
|---|---|---|
| `LaunchAccessState`, `AuthProviderId`, `MembershipStatus` | `src/shared/account/launchAccess.ts` | Local preview identity + membership state |
| `launchLifecycleGate.ts` | `src/shared/account/` | Env-gated launch auth/membership gates |
| `bridgeSecretAccess.ts` | `src/services/agent/` | Agent bridge shared secret (browser storage, outside workspace JSON) |
| `bridgeReplayGuard.ts`, `bridgeNonceStore.ts` | `src/services/agent/` | Bridge replay/nonce protection |
| `aiSecretsAccess.ts` | `src/services/ai/` | AI bridge secrets outside workspace JSON |
| `SyncHubSettings`, `IdentityProviderSettings` | `src/types/domain.ts` | Provider clientId/status/auth/profile (non-secret metadata) |
| `agentInterop.ts` session/scoping types | `src/types/agentInterop.ts` | Session, trust tier, permission tier |

### Usage / billing-ish surfaces
| Surface | Where | Notes |
|---|---|---|
| `localProductUsage.ts` | `src/services/usage/` | Local aggregates only; `product-usage-v1` |
| `LocalProductUsageReadout.tsx` | `src/pages/mobile/` | Usage readout UI |
| “Open billing portal link” | `src/pages/mobile/MobileSettingsView.tsx` | Placeholder, not verified billing |
| Membership gate | `src/shared/account/launchLifecycleGate.ts` | Comments: production billing needs server-side entitlements, not shipped |

### Constants / hard-coded limits present in code today
These are literal config-shaped values in code. Some are storage/query caps; some are behavior thresholds. All should be inventoried with owners.

| Constant | Where | Category |
|---|---|---|
| `MAX_CHECKPOINT_ENTRIES = 600` | `src/services/execution/checkpointStore.ts` | Platform/storage cap |
| `MAX_SUMMARY_LEN = 240` | `src/services/execution/checkpointStore.ts` | Platform/storage cap |
| `MAX_ID_LEN = 160` | `src/services/execution/checkpointStore.ts` | Platform/storage cap |
| `MAX_OPERATOR_TRACE_ENTRIES = 1000` | `src/services/dataset/operatorTraces.ts` | Platform/storage cap |
| `MAX_DETAIL_KEYS`, `MAX_DETAIL_STRING_LEN=200`, `MAX_VERB_LEN=80`, `MAX_ROUTE_LEN=120`, `MAX_ENTITY_ID_LEN=120`, `MAX_NOTE_LEN=500` | `src/services/dataset/operatorTraces.ts` | Platform/storage cap |
| `MAX_ACTION_PIPELINE_STEPS = 12` | `src/services/ai/actionPipeline.ts` | AI pipeline cap |
| `MAX_STRUCTURED_AGENT_COMMAND_CHARS` | `src/services/ai/actionPipeline.ts` | AI pipeline cap |
| `MAX_AI_ASSISTANT_TURN_TRACES = 400` | `src/services/ai/aiAssistantTraceLog.ts` | Storage cap |
| `MAX_PREVIEW_CHARS = 900` | `src/services/ai/aiAssistantTraceLog.ts` | Storage cap |
| `MAX_SOURCE_CHARS = 48_000` | `src/services/digitalTwin/digitalTwin.ts` | AI/twin cap |
| `MAX_WORKSPACE_DECISION_MEMORY = 80` | `src/services/workspaceIntelligence/workspaceIntelligence.ts` | Intelligence cap |
| `MAX_WORKSPACE_OPPORTUNITIES = 12` | `src/services/workspaceIntelligence/workspaceIntelligence.ts` | Intelligence cap |
| `MAX_WORKSPACE_OPERATING_MANUAL_SECTIONS = 12` | `src/services/workspaceIntelligence/workspaceIntelligence.ts` | Intelligence cap |
| `MAX_DAY_KEYS=**` | `src/services/usage/localProductUsage.ts` | Usage cap |
| `MAX_ROLLING_SAMPLES = 32` | `src/services/usage/localProductUsage.ts` | Usage cap |
| `MAX_AI_TRACE_BUNDLES` | `src/services/storage/storage.ts` (imported) | AI trace cap |
| `MAX_AGENT_EVENTS`, `MAX_AGENT_SESSIONS`, `MAX_AGENT_PROPOSALS`, `MAX_INTEGRATION_ARTIFACTS`, `MAX_AUDIT_ENTRIES` | `src/services/storage/storage.ts` (imports) | Platform caps |
| `MAX_AI_URL_LEN = 2048` | `src/services/storage/storage.ts` | AI bridge validation |
| `MAX_AI_MODEL_ID_LEN = 128` | `src/services/storage/storage.ts` | AI bridge validation |
| `MAX_COPILOT_WORKERS = 8` | `src/services/storage/storage.ts` | Copilot cap |
| `MAX_COPILOT_ID_LEN = 64`, `MAX_COPILOT_NAME_LEN = 80`, `MAX_COPILOT_DESC_LEN = 280`, `MAX_COPILOT_INSTRUCTIONS_LEN = 4000`, `MAX_COPILOT_MODEL_LEN = 128` | `src/services/storage/storage.ts` | Copilot validation |
| `MAX_ALLOWED_AGENT_COMMAND_TOKENS = 16` | `src/services/storage/storage.ts` | Copilot validation |
| `MAX_AGENT_COMMAND_TOKEN_LEN = 120` | `src/services/storage/storage.ts` | Copilot validation |
| `INTELLIGENCE_RULES_SCHEMA_VERSION = 1` | `src/rules/intelligenceRulesTypes.ts` | Intelligence rules version |
| Scoring/threshold defaults | `src/rules/intelligenceRulesDefaults.ts` | Intelligence defaults (heat bands, follow-up bands, outreach stale/after, opportunity value divisor/cap, digest thresholds) |

### Feature-flag / experiment-like surfaces today
No formal feature-flag registry exists. Mode switches and env-gated behaviors act like primitive flags:

- `aiAdapterMode`
- `localModelEnabled`
- `aiOperatorMode`
- `debugMode`
- `aiRoutingDiagnosticsEnabled`
- `VITE_SKIP_LAUNCH_AUTH`
- `VITE_ENFORCE_MEMBERSHIP_GATE`
- `VITE_INTELLIGENCE_RULES_URL`

These are **not** separated into configuration vs feature flag vs entitlement vs experiment today.

### Entitlement / billing surfaces today
No real entitlement or billing config object. Only:
- Local usage aggregates
- Membership gate gating
- Billing portal nav link placeholder

**GAP** — entitlement is described in README but not present as a persisted/resolved config object.

### Notification policy surfaces today
PARTIAL:
- `notificationCenter` preferences
- Daily digest center
- Workday hours
- `managerialWeight`
- User-editable `promptTemplate` and `roleContext`

No separate notification policy object (severity threshold, digest vs immediate, quiet hours, escalation, recipient/role routing, deduplication, rate limiting) as a persisted config object.

**GAP**.

### Organizational business profile / baselines surfaces today
PARTIAL:
- `timezone` in `AppSettings`
- `workdayStartHour` / `workdayEndHour` in `notificationCenter`
- Intelligence rules scoring thresholds

No explicit `OrganizationBusinessProfile` object in persisted settings. No `BusinessBaselines` object. The README/domainTypes/action matrix describe these, but they are not yet a first-class persisted config object.

**GAP**.

---

## 2) Findings

### Contradictions
- `AppSettings.timezone` and `notificationCenter.workdayStartHour`/`workdayEndHour` are used as org-like defaults, but there is no explicit org business profile object. The code treats some user settings as if they were org policy, which muddies precedence.
- Intelligence scoring thresholds live in `intelligenceRulesDefaults.ts` and are tunable via `mergeIntelligenceRules`, but some behavior thresholds (e.g. external-action markers in `planExecutor.ts`) are hardcoded strings/comments rather than configurable policy.

### Duplication
- Storage normalization logic is unified inline in `src/services/storage/storage.ts` (`withDefaults`). The former duplication with `src/services/storage/normalizers/*` was **resolved** — the redundant normalizer tree was deleted (see banner).
- `EXTERNAL_ACTION_MARKERS` in `planExecutor.ts` is a hardcoded marker list that should be treated as platform policy, not duplicated across execution code.

### Unused / dead-ish surfaces
- No formal feature-flag registry exists; mode switches are used as ad-hoc flags.
- Billing/entitlement surfaces are placeholders, not wired to a server-side entitlement check.

### Insecure / risky defaults
- `debugMode` persists in settings and can expose verbose behavior; should be auditable and ideally gated in non-dev deployments.
- `aiAdapterMode` / `localModelEnabled` / `aiOperatorMode` are user-controllable; misconfiguration could downgrade safety or routing; UI must explain constraints.
- `notificationCenter.promptTemplate` and `roleContext` are user-editable strings; should have validation/length/sanity limits and audit for template edits.
- `syncHub` stores provider `clientId`/auth/profile; not secrets but sensitive-ish config; today’s normalization does strip/validate, which is good.

### Hard-coded thresholds
- See constants table above. Many are storage/query caps (reasonable to keep as platform constants), but some behavior thresholds should become configurable policy entries (especially action-policy limits, intelligence scoring thresholds where tunable, and AI budget/timeout defaults).

---

## 3) Precedence model (recommended)

Recommended precedence order:

```
secure platform defaults
  → deployment/environment constraints
    → plan/entitlement
      → organization policy
        → team policy
          → user preference
            → session/view preference
```

Rules:
- Lower levels can never weaken higher-level security, authorization, tenant isolation, or action-risk policy.
- If a user preference conflicts with org security policy, org policy wins and the UI explains the constraint.
- Deployment/env constraints can only further restrict, not expand, platform defaults.
- Entitlements are checked server-side and can gate capability but do not rewrite security policy.

---

## 4) Concept separation

| Concept | Purpose | Example in this repo |
|---|---|---|
| Configuration | Behavior | timezone, workday hours, AI bridge URLs, action policy matrix, intelligence scoring thresholds |
| Feature flag | Temporary/progressive rollout | New model variant, new card, new scoring algorithm; not permanent billing checks |
| Entitlement | Purchased/permitted capability | Connector slots, AI budget, advanced modules; checked server-side |
| Experiment | Measurement with hypothesis/cohort/guardrails | Alternative daily-brief composition; must not alter consequential action policy without review |

Today, the repo conflates some of these: `aiAdapterMode`, `localModelEnabled`, `aiOperatorMode`, `debugMode` act as configuration and as de-facto feature flags. Recommendation: classify each explicitly in a registry.

---

## 5) Vendor-neutral feature-evaluation abstraction (OpenFeature-compatible concept)

Recommended shape (conceptual; not tied to a specific vendor SDK):

- `FeatureProvider` interface with `getFlag(name, context)` returning `undefined` when unavailable.
- `FeatureService` layer that:
  - resolves flag value from provider
  - falls back to a safe default when provider unavailable
  - records evaluation metadata for audit/debug
- Flag metadata: `flagKey`, `owner`, `description`, `creationDate`, `expectedExpiry`, `rolloutState`.
- Cleanup gate: stale flags past expected expiry raise a maintainer alert; permanent authorization/billing checks must not live in flag land.

The repo already has the building blocks for a flag evaluation layer (mode switches, env gates, intelligence rules remote patch). The missing piece is an explicit abstraction with safe defaults and cleanup metadata.

---

## 6) Recommended Configuration Registry entries (starting set)

Every entry below follows the registry shape in `src/config/controlPlane/configTaxonomy.ts` (`ConfigRegistryEntry`).

### Build-time
- `build.viteConfig` — build packaging config
- `build.tailwindConfig` — design-token/class config
- `build.publicAssets` — extension manifest assets
- `build.envTypes` — `VITE_*` type declarations

### Deployment
- `deployment.envDevelopment` — dev overrides
- `deployment.envExample` — template
- `deployment.vitePrivacyPolicyUrl`
- `deployment.vitePublicOrigin`
- `deployment.viteEnforceMembershipGate`
- `deployment.viteStripeCheckoutUrl`
- `deployment.viteStripeBillingPortalUrl`
- `deployment.viteSkipLaunchAuth`
- `deployment.viteIntelligenceRulesUrl`

### Platform
- `platform.defaultAiBridgeSettings`
- `platform.defaultBrandProfile`
- `platform.defaultAppSettings`
- `platform.defaultCopilotWorkerRegistry`
- `platform.operatingPresets`
- `platform.cockpitCapabilities`
- `platform.workspaceModules`
- `platform.dashboardNavigation`
- `platform.actionPolicyMatrix` (default matrix)
- `platform.intelligenceRulesDefaults`
- `platform.intelligenceRulesSchemaVersion`
- `platform.externalActionMarkers` (from `planExecutor.ts`)
- `platform.storageCaps` (the various MAX_* constants)

### Tenant / organization
- `tenant.organizationBusinessProfile` — GAP today; recommended new persisted object
- `tenant.businessBaselines` — GAP today; recommended new persisted object
- `tenant.attentionPolicy` — GAP today; recommended new persisted object
- `tenant.financialPolicy` — partially described; recommended
- `tenant.clientImportancePolicy` — recommended
- `tenant.ownershipRoutingConfig` — recommended
- `tenant.ownerDependencyPolicy` — recommended
- `tenant.suppressionAndExceptionRules` — recommended

### Team
- `team.defaultOwners`
- `team.escalationOwners`
- `team.backupOwners`
- `team.roundRobinRules`
- `team.businessUnitBoundaries`
- `team.delegableUserIds`

### User
- `user.theme`
- `user.cockpitLayout`
- `user.cockpitDensity`
- `user.workdayStartHour`
- `user.workdayEndHour`
- `user.aiAdapterMode`
- `user.localModelEnabled`
- `user.aiOperatorMode`
- `user.aiRoutingDiagnosticsEnabled`
- `user.copilotWorkers`
- `user.overlay`
- `user.automationRules`
- `user.notificationCenter`
- `user.operatorTwin`
- `user.cadenceFlow`
- `user.aiBridge`
- `user.operatingProfile`
- `user.primaryIdentityProvider`
- `user.debugMode`
- `user.operatorTraceCollectionEnabled`
- `user.connectedIdentityLearningEnabled`
- `user.defaultReminderLeadHours`
- `user.weekStartsOn`
- `user.timezone` (today persisted at user/settings level; may be promoted to org in multi-user future)

### Connector
- `connector.integrationHub`
- `connector.syncHub`
- `connector.perConnectorConfig` — GAP today; recommended richer per-connector config (channels, freshness, polling cadence, write capabilities)

### AI
- `ai.inferenceBaseUrl`
- `ai.embeddingBaseUrl`
- `ai.chatModelId`
- `ai.embeddingModelId`
- `ai.aiOperatorMode`
- `ai.aiRoutingDiagnosticsEnabled`
- `ai.taskRoutings` — GAP today; recommended
- `ai.budget` — GAP today; recommended
- `ai.trustSafety` — GAP today; recommended
- `ai.enabledCapabilities` — GAP today; recommended
- `ai.systemPromptArtifacts` — GAP today; recommended versioned artifacts

### Security
- `security.debugMode`
- `security.primaryIdentityProvider`
- `security.syncHub`
- `security.sessionLifetime` — GAP today
- `security.idleTimeout` — GAP today
- `security.reauthForHighRiskChanges` — GAP today
- `security.apiKeyGovernance` — GAP today
- `security.signOutRevocation` — GAP today

### Experiment
- `experiment.featureFlags` — GAP today; recommended registry

### Entitlement
- `entitlement.planCapabilities` — GAP today; recommended

### Runtime
- `runtime.businessCoverageState` — recommended derived state
- `runtime.observedBaselines` — recommended
- `runtime.aiRecommendedBaselines` — recommended
- `runtime.configurationHealth` — recommended
- `runtime.degradedMode` — recommended

---

## 7) Organization Business Profile (recommended shape)

Aligned to existing `src/config/controlPlane/domainTypes.ts`:

- `orgId`
- `displayName`
- `timezone`
- `locale`
- `weekStartsOn`
- `workingDays`
- `businessHoursStart`, `businessHoursEnd`
- `holidays[]`
- `baseCurrency`, `reportingCurrency`
- `fiscalYearStartMonth`
- `industrySubtype`
- `sizeBand`
- `operatingModel`
- `importantClientDefinition`
- `importantClientIds[]`
- `businessUnits[]`
- `teams[]`
- `locations[]`
- `normalResponseExpectationHours`
- `observesWorkingTimeSemantics`

This should become a persisted tenant-level config object, not just a type description.

---

## 8) Business Baselines (recommended shape)

Aligned to existing `src/config/controlPlane/domainTypes.ts` `BusinessBaselines`:

- `expectedLeadResponseBusinessHours`
- `invoiceOverdueAfterDays`
- `invoiceEscalationAfterDays`
- `typicalDeliveryCycleBusinessDays`
- `utilizationTargetPercent`
- `clientMessageAcknowledgmentBusinessHours`
- `defaultDeliveryBufferBusinessDays`
- `approvalSLABusinessHours`
- `highValueOpportunityThresholdUsd`
- `receivableAgingBands[]`

Three-way distinction recommended:
- configured baseline
- observed baseline
- AI-recommended baseline

Policy needed for whether recommendations may become active.

---

## 9) Business-hours / elapsed-business-time semantics (recommended)

- Compute elapsed business time in the org timezone using `workingDays`, `businessHoursStart`, `businessHoursEnd`, and `holidays`.
- Non-working periods must not create false-neglect signals.
- Attention/notification/severity thresholds should be expressed in business-time where the product promises business-hour behavior.
- `observesWorkingTimeSemantics` toggles whether weekend/non-business SLA expectations apply.

---

## 10) Rollout + blockers

### P0
- Classify every existing config surface explicitly (this report).
- Gate `debugMode` in non-dev deployments.
- Validate/audit `notificationCenter.promptTemplate` and `roleContext` editing.
- Keep external-action markers and action-policy limits as explicit policy, not scattered magic strings.

### P1
- Introduce Configuration Registry + precedence resolver skeleton.
- Separate configuration vs feature flag vs entitlement vs experiment.
- Add Organization Business Profile + Business Baselines as persisted objects behind Settings/Admin, keeping Command Center unchanged.
- Add elapsed-business-time semantics for attention/notification thresholds.
- Add per-connector config shape (channels, freshness, polling cadence, write capabilities).

### P2
- Formal feature-flag registry with safe defaults + cleanup metadata.
- Entitlement object (server-side check) — only relevant once server-side entitlement exists.
- Notification policy object (severity threshold, digest vs immediate, quiet hours, escalation, deduplication, rate limiting).
- Security policy object (session lifetime, idle timeout, reauth, API key governance).
- Degraded modes / kill switches.
- Configuration health service + admin UI.

### Blockers / UNVERIFIED today
- Multi-user/organization tenancy is not the current local-first model; org vs user separation is partially conceptual.
- Server-side entitlement does not exist yet; billing/entitlement surfaces are placeholders.
- No formal feature-flag/experiment registry.
- Some behavior thresholds are hardcoded in execution/intelligence code rather than configurable policy.

---

## 11) What changes and what does not

- **Does not change:** Command Center daily experience; existing settings normalization contract; existing AI routing/action-policy/intelligence defaults behavior materially.
- **Does change:** How configuration is classified, resolved, and extended; where new org/business baselines live; how flags/entitlements/experiments are separated conceptually and in code.

---

*End of report.*
