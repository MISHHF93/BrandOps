# Surface wiring inventory

Matrix of [`BrandOpsData`](src/types/domain.ts) vs [`buildWorkspaceSnapshot`](src/pages/mobile/buildWorkspaceSnapshot.ts), five-tab shell UI, and [`parseCommandRoute`](src/services/agent/intent/commandIntent.ts) / [`executeAgentWorkspaceCommand`](src/services/agent/agentWorkspaceEngine.ts). Keep this file updated when adding snapshot fields or agent routes.

| Domain key | Snapshot (field / summary) | Shell / other UI | Agent route(s) |
|------------|----------------------------|------------------|----------------|
| `brand` | `operatorName`, `focusMetric`, `primaryOffer`; full strip in `settingsFullReadout` | Today (cockpit copy), Settings readout | `configure-workspace` (natural language) |
| `brandVault` | `cockpitBrandVaultReadout` (previews + list-field count) | Today · Brand & content | none (refine via Chat freeform / future commands) |
| `modules` | indirect counts via opportunities, content, etc. | Today · Workspace lanes `details` | none |
| `publishingQueue` | `publishingQueue`, `queuedPublishing`, `cockpitPublishingPeek`, `nextPublishingHint` | Today, Chat digest | `reschedule-publishing`, `add-publishing-draft`, `update-publishing` |
| `contentLibrary` | `cockpitContentPeek`, `contentTopSignals` | Today | `add-content`, `update-content`, `duplicate-content`, `archive-content` |
| `contacts` | `cockpitContactsPeek` | Today | `add-contact`, `update-contact`, `update-contact-relationship` |
| `companies` | `cockpitCompanyPeek` | Today · Connections | none |
| `notes` | `notes` (count), `cockpitRecentNotesPeek` | Today, Chat digest | `add-note` |
| `outreachDrafts` | `outreachDrafts`, `outreachUrgencyTop` | Today | `add-outreach-draft` |
| `outreachTemplates` | `cockpitOutreachTemplatePeek` | Today · Pipeline | none |
| `outreachHistory` | `cockpitOutreachHistoryPeek` | Today · Pipeline | none |
| `followUps` | `incompleteFollowUps`, `followUpRiskTop`, scheduler links | Today | `create-follow-up`, `complete-follow-up` |
| `opportunities` | `activeOpportunities`, `pipelineProjection`, `opportunitiesToClose`, `pipelineSignals`, `cockpitOpportunityPeek` | Today | `pipeline-health`, `update-opportunity`, `archive-opportunity`, `restore-opportunity` |
| `messagingVault` | `settingsMessagingVaultPeek` | Settings | none |
| `scheduler` | `dueTodayTasks`, `missedTasks`, `cockpitSchedulerTaskPeek` | Today | indirect via follow-up / publishing flows |
| `settings` | many scalars + `settingsFullReadout` | Today (cadence copy), Settings | `configure-workspace` |
| `externalSync` | `externalSyncLinksPeek` | Integrations | none |
| `integrationHub` | `integrationHubSources`, `integrationArtifactsPeek`, `sshTargetsPeek`, `integrationLiveFeedPeek`, counts | Integrations, Today (counts) | `add-integration-source`, `add-integration-artifact`, `add-ssh-target` |
| `seed` | `seedReadout` | Settings · Dataset lineage | storage / reset flows |
| `agentAudit` | `recentAudit` | Settings | re-run prior `commandPreview` as Chat |

**LinkedIn overlay:** [`src/content/linkedinOverlay.ts`](src/content/linkedinOverlay.ts) reads `companies` (and related) for overlay UI — not the five-tab shell.

**Help:** [`help.html`](help.html) → [`HelpKnowledgeRoot`](src/pages/help/HelpKnowledgeRoot.tsx) → [`KnowledgeCenterBody`](src/shared/help/KnowledgeCenterBody.tsx) (not `MobileApp`).

**Capability map config:** [`cockpitCapabilities`](src/shared/config/capabilityMap.ts) is rendered in Settings (runtime disclosure) as the “Capability map” block.

### Intelligence rules pack (not on `BrandOpsData`)

| Concern | Snapshot | Shell | Agent |
|---------|----------|-------|-------|
| `IntelligenceRulesPack` via `getIntelligenceRules()` | `intelligenceRulesReadout` in [`buildWorkspaceSnapshot.ts`](src/pages/mobile/buildWorkspaceSnapshot.ts) | Settings · **Intelligence rules (effective)** | none |

**Load:** [`initIntelligenceRulesFromRemote`](src/rules/intelligenceRulesRuntime.ts) runs from the MV3 background script (`onInstalled` / `onStartup`) and from extension document entrypoints: [`renderChatbotSurface.tsx`](src/pages/chatbotWeb/renderChatbotSurface.tsx) (all `MobileApp` HTML hosts, including `mobile.html` via [`main.tsx`](src/pages/mobile/main.tsx)), plus [`help/main.tsx`](src/pages/help/main.tsx) for the Knowledge Center. Optional JSON: `VITE_INTELLIGENCE_RULES_URL` first, then `brandops-intelligence-rules.json` (packaged path via `chrome.runtime.getURL` in the extension, or `/brandops-intelligence-rules.json` in dev). Template: [`public/brandops-intelligence-rules.example.json`](public/brandops-intelligence-rules.example.json).

---

## Follow-up: commands / engine (out of current peek-only phase)

Suggested routes or parsers when you add mutation support:

| Data | Gap |
|------|-----|
| `companies` | No `parseCommandRoute` / engine branch for add/update/archive company |
| `outreachTemplates` | No add/edit/duplicate template command |
| `outreachHistory` | Append-only today; optional “log outcome” command if product needs it |
| `brandVault` / `messagingVault` | No structured vault edit commands (today: `configure-workspace` + freeform or future `update brand vault: …`) |

Per-row targeting for opportunities, content, etc. remains a larger engine + intent project.
