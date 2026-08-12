/**
 * Operator twin — Encode → Align → Decode
 *
 * **Encode**: Brand profile, résumé/CV artifact, live workspace entities, and integration signals
 * define who the operator is and what world they run in.
 *
 * **Align**: Curated `BrandProfile` wins on conflicts vs résumé Phase R; résumé supplements hosted Ask only.
 * Staleness: `operatorTwin.version` / `lastIngestAt` track ingest lifecycle (see Settings twin ingest UI).
 *
 * **Decode**: Hosted `ask:` uses `buildOperatorTwinSystemBlock` (résumé appendix + policy). On-device commands
 * use structured workspace JSON; nothing is uploaded until the user sends a hosted line.
 */
/** Raw persisted slice under `settings.operatorTwin` (partial OK before normalize). */
export interface OperatorTwinSettings {
  /** Phase R compressed résumé / CV (pipe-separated facets). Canonical store for hosted Ask. */
  resumeArtifact: string;
  /** Bump on each successful résumé ingest (or manual clear + re-save). */
  version: number;
  /** ISO time of last résumé artifact save. */
  lastIngestAt?: string;
  /** Non-PII provenance hint (e.g. "pasted text", filename). */
  sourceSummary?: string;
  /** Lightweight self-rating vs `BrandProfile.focusMetric` (newest first after normalize). */
  kpiSelfChecks?: FocusKpiSelfCheck[];
}

/** One self check-in toward “full marks” on the stated focus metric. */
export interface FocusKpiSelfCheck {
  score: 1 | 2 | 3 | 4 | 5;
  note: string;
  recordedAt: string;
}
