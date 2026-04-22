# BrandOps Agent Migration Plan

## Goal

Complete the migration from a local assistant scaffold to a production-ready **AI Agent Platform** with secure multi-channel command execution.

## Current Implementation Status

- Done: Agent orchestration contract (`src/services/agent/orchestrator.ts`)
- Done: Channel command execution (`src/services/agent/channelCommandExecutor.ts`)
- Done: Telegram/WhatsApp payload adapters (`src/services/agent/channelPayloadAdapters.ts`)
- Done: Signed bridge utilities (`src/services/agent/webhookBridge.ts`)
- Done: Runtime handlers for channel event, webhook, and signed envelope (`src/background/index.ts`)
- Done: Unit coverage for payload adapters and bridge verification
- Done: Android-first mobile chatbot shell (`mobile.html`, `src/pages/mobile/*`)
- Done: Capacitor setup scaffold (`capacitor.config.ts`, package scripts)

## Cleanup Completed

- Consolidated duplicated webhook execution logic in `src/background/index.ts` into one helper (`executeAndRespondFromWebhookPayload`).
- Removed duplicate planning doc to keep one migration source of truth.

## Migration Workplan (Next)

### Phase 0: UI Pivot Foundation (Completed)

1. [x] Added mobile web entrypoint (`mobile.html`) for Android-targeted UX.
2. [x] Added chatbot-first mobile app shell with bottom navigation.
3. [x] Installed Capacitor core, CLI, and Android packages.
4. [x] Added Android run/sync scripts to package scripts.

### Phase A: Secure Transport and Replay Protection

1. [x] Build backend webhook proxy for Telegram and WhatsApp.
2. [~] Validate provider signatures in backend.
3. [x] Sign extension bridge envelopes (HMAC SHA-256).
4. [x] Add nonce replay cache with TTL (runtime in-memory guard).

Implemented now:

- `scripts/bridge-proxy.mjs` receives `/webhooks/telegram` and `/webhooks/whatsapp`, signs bridge envelopes, and forwards them as `AGENT_BRIDGE_ENVELOPE`.
- `src/services/agent/bridgeReplayGuard.ts` blocks replayed nonces inside TTL window.
- `src/background/index.ts` enforces replay rejection before bridge verification and execution.

Remaining for Phase A hardening:

- Replace in-memory replay guard with shared Redis/KV store for multi-instance backend deployment.
- Replace placeholder provider checks with official signature verification for Meta and Telegram in production.

### Phase B: Command Safety and Governance

1. Add operator allowlist/role checks.
2. Add high-risk action approvals before execution.
3. Add command rate limiting and cooldown guards.
4. Add per-channel policy filters (WhatsApp template constraints, LinkedIn limits).

### Phase C: Workflow Expansion

1. Expand intent parser beyond keyword matching.
2. Add structured actions for CRM, outreach, and campaign analytics updates.
3. Add reversible action snapshots for critical mutations.
4. Add deterministic confirmation responses with trace IDs.

### Phase D: Observability and Launch

1. Add command audit log (input, normalized payload, action, result, actor, traceId).
2. Add failure telemetry and retry dashboards.
3. Run pilot with Telegram first, then WhatsApp.
4. Roll out LinkedIn action pipeline behind feature flags.

## Deletion / Leftover Checklist

- Keep legacy AI settings mode (`src/services/ai/aiSettingsMode.ts`) for existing settings UX until equivalent agent tooling is released.
- Keep local LLM adapter route for fallback behavior (`src/services/llm/providerAdapter.ts`).
- Remove old paths only after replacement is live and tested in production:
  - `AGENT_CHANNEL_EVENT` direct mode (optional to deprecate after bridge-only adoption)
  - keyword-only executor logic (after structured intent engine replaces it)

## Validation Gate (Required Before Each Release)

1. `npm run typecheck`
2. `npm run test:unit`
3. Manual runtime tests:
   - Telegram webhook -> normalized event -> note update
   - WhatsApp webhook -> normalized event -> publishing reschedule
   - Invalid signature -> rejected with no mutation

## Local Runbook (Bridge Proxy)

Set environment variables:

- `BRIDGE_SHARED_SECRET`
- `BRIDGE_TARGET_URL`
- optional: `TELEGRAM_WEBHOOK_TOKEN`
- optional: `WHATSAPP_VERIFY_TOKEN`

Run:

- `npm run bridge:proxy`
