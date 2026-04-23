# Mobile Settings — architecture and implementation notes

Internal reference: how the Settings tab relates to workspace data and the rest of the shell.

## Data flow

- **Persistence:** `BrandOpsData` (including `AppSettings` and `brand`) is read/written via `storageService` in [`src/services/storage/storage.ts`](../src/services/storage/storage.ts).
- **Apply path (Preferences):** The editable panel in [`MobileSettingsView.tsx`](../src/pages/mobile/MobileSettingsView.tsx) calls `applySettingsConfigure`, which runs `executeAgentWorkspaceCommand` with a `configure:` line (see [`runSettingsConfigure.ts`](../src/pages/mobile/runSettingsConfigure.ts) and [`mobileApp.tsx`](../src/pages/mobile/mobileApp.tsx)). The engine runs [`configureWorkspace`](../src/services/agent/agentWorkspaceEngine.ts) → `buildAiSettingsPlan` / `applyAiSettingsOperations` in [`aiSettingsMode.ts`](../src/services/ai/aiSettingsMode.ts), then persists with scheduler reconciliation.
- **Snapshot for UI:** [`buildWorkspaceSnapshot`](../src/pages/mobile/buildWorkspaceSnapshot.ts) projects stored data for tabs; `settingsFullReadout` is built in [`mobileSettingsReadout.ts`](../src/pages/mobile/mobileSettingsReadout.ts).
- **Document theme:** After any refresh from storage, [`applyDocumentThemeFromAppSettings`](../src/shared/ui/theme.ts) runs so `data-theme`, `data-visual-mode`, and `data-motion-mode` on `<html>` match persisted settings without a full reload (see `refreshWorkspaceSnapshot` in `mobileApp.tsx`).

## Extension packaging

- Chrome MV3 `options_ui` points at **`integrations.html`**, not a separate `options` HTML page. [`extensionLinks.ts`](../src/shared/navigation/extensionLinks.ts) documents entry surfaces.

## Gaps and future work

- **Coverage:** The editable form only maps to what `buildAiSettingsPlan` supports. Many `AppSettings` fields remain read-only in the “Workspace model” block until more operation kinds are added to `aiSettingsMode`.
- **Intelligence rules** on Settings are a readout only; source is bundled JSON, env, or embed defaults.
- **Presets** use the Chat `runCommand` path for visibility, while **Apply** uses the silent `configure` path; both are intentional but different mental models.
