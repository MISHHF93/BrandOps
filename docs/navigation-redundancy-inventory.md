# Navigation redundancy inventory (2026)

Structured artifact inquiry for the shared shell (`renderChatbotSurface` → `MobileApp`). Columns: **Artifact**, **Evidence**, **Verdict**, **Risk**.

| Artifact | Evidence | Verdict | Risk |
|----------|----------|---------|------|
| `PulseTimelineView.tsx` | No importers outside the file | **Removed** | Low — unused UI |
| `pulseHomeModel.ts` + unit test | Only referenced by `pulseHomeModel.test.ts` | **Removed** | Low — no production use |
| `onOpenPulse` on Pipeline / Brand cockpit sections | Prop passed from `CockpitDailyView` but components never destructured it | **Removed** chain | Low |
| Assistant triple Plan CTAs | Inline Plan link, dashboard icon, Queue pill (+ dock + palette) | **Flattened** to single Plan icon | Medium — discoverability mitigated by dock / ⌘K |
| Plan destination grid vs palette | Same destinations as `COMMAND_PALETTE_NAV_TARGETS` | **Slimmed** Connect / Setup / Commands tiles; Integrations & Settings via ⌘K | Medium — document in header copy |
| Vitality in Pulse + Today focus + Assistant pills | Three `WorkspaceSignalsBoard` / pill contexts | **Deferred merge** (see plan) | High if collapsed blindly |

**Implementation notes:** Palette label **Workspace overview** → **Plan**. Cockpit SR copy **Pulse** (queue metaphor) → **Plan queue** where it referred to the hub tab.
