/**
 * Evidence search across the workspace's persisted evidence surface.
 *
 * An external AI asking "what actually supports this claim?" must get proof it
 * can cite, not prose it has to trust. Every hit therefore carries its source,
 * provenance ref, and trust tier — and agent-reported evidence is returned
 * labelled as unverified rather than quietly mixed in with verified fact.
 *
 * Sources searched (all persisted in `BrandOpsData`):
 * - achievement candidates and their evidence refs (`builderActivity.achievements`)
 * - raw activity events carrying evidence (`builderActivity.events`)
 * - external agent events awaiting review (`externalAgentEvents`)
 * - Twin resume facts: experience highlights, projects, certifications
 * - execution receipts (`planWorkspace.receipts`)
 *
 * The in-memory `evidenceLedger` is deliberately not read here: it does not
 * survive the process, so a gateway running against an exported workspace would
 * report evidence that is not actually in the workspace.
 */
import type { BrandOpsData } from '../../types/domain';
import type { TrustTier } from '../../types/agentInterop';
import { getActiveDigitalTwin } from '../digitalTwin/digitalTwin';
import { trustTierLabel } from './trustBoundaries';
import { EVIDENCE_RELEVANCE_FLOOR, relevanceOverlap, relevanceTokens } from './textRelevance';

export type EvidenceHitSource =
  | 'achievement'
  | 'activity-event'
  | 'agent-event'
  | 'twin-experience'
  | 'twin-project'
  | 'twin-certification'
  | 'receipt';

export interface EvidenceHit {
  id: string;
  /** Short claim-facing statement of what this evidence shows. */
  statement: string;
  source: EvidenceHitSource;
  /** Citable refs (git sha, release tag, document path, URL). */
  refs: string[];
  trustTier: TrustTier;
  trustLabel: string;
  /** Where this came from inside BrandOps. */
  provenanceRef: string;
  observedAt?: string;
  relevanceScore: number;
}

export interface EvidenceSearchResult {
  claim: string;
  hits: EvidenceHit[];
  /** Counts by trust tier so a caller can weigh the answer, not just read it. */
  verifiedCount: number;
  agentReportedCount: number;
  /** Honest statement of what this search could not see. */
  limitations: string[];
  searchedSources: EvidenceHitSource[];
  generatedAt: string;
}

const MAX_STATEMENT = 300;

function compact(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_STATEMENT);
}

export function searchWorkspaceEvidence(
  workspace: BrandOpsData,
  claim: string,
  limit = 10
): EvidenceSearchResult {
  const now = new Date().toISOString();
  const query = compact(claim);
  const tokens = relevanceTokens(query);
  /**
   * An *empty* claim is a browse — "show me recent evidence" — and returning the
   * most recent records is the right answer. A claim that is non-empty but
   * yields no meaningful tokens is a different thing entirely: the caller asked
   * something, and it carried nothing searchable. Treating that as a browse
   * returned the entire workspace as "evidence" for "the and for with".
   */
  const unsearchable = query.length > 0 && tokens.length === 0;
  const capped = Math.max(1, Math.min(25, limit));
  const hits: EvidenceHit[] = [];
  const searched = new Set<EvidenceHitSource>();

  const push = (hit: Omit<EvidenceHit, 'trustLabel' | 'relevanceScore'>, haystack: string) => {
    if (unsearchable) return;
    const relevanceScore = relevanceOverlap(tokens, haystack);
    // A single incidental token is coincidence, not support.
    if (tokens.length && relevanceScore < EVIDENCE_RELEVANCE_FLOOR) return;
    searched.add(hit.source);
    hits.push({
      ...hit,
      trustLabel: trustTierLabel(hit.trustTier),
      relevanceScore: Math.round(relevanceScore * 100) / 100
    });
  };

  // ── Achievement candidates ────────────────────────────────────────────
  for (const achievement of workspace.builderActivity?.achievements ?? []) {
    if (achievement.dismissed) continue;
    const refs = (achievement.evidence ?? []).map((entry) => entry.ref).filter(Boolean);
    push(
      {
        id: achievement.id,
        statement: compact(`${achievement.title} — ${achievement.description}`),
        source: 'achievement',
        refs,
        // A candidate is a proposal until the user promotes it.
        trustTier: achievement.verifiedAt ? 'USER_VERIFIED' : 'AGENT_REPORTED',
        provenanceRef: `brandops://achievement/${achievement.id}`,
        observedAt: achievement.detectedAt
      },
      `${achievement.title} ${achievement.description} ${achievement.reason} ${refs.join(' ')} ${(
        achievement.professionalRelevance ?? []
      ).join(' ')}`
    );
  }

  // ── Activity events that carry evidence ───────────────────────────────
  for (const event of workspace.builderActivity?.events ?? []) {
    if (!event.evidence?.length) continue;
    const refs = event.evidence.map((entry) => entry.ref).filter(Boolean);
    push(
      {
        id: event.id,
        statement: compact(`${event.title} — ${event.detail}`),
        source: 'activity-event',
        refs,
        trustTier: event.trustTier,
        provenanceRef: `brandops://activity/${event.id}`,
        observedAt: event.timestamp
      },
      `${event.title} ${event.detail} ${refs.join(' ')}`
    );
  }

  // ── External agent events (unverified until promoted) ─────────────────
  for (const event of workspace.externalAgentEvents?.entries ?? []) {
    const refs = (event.evidence ?? []).map((entry) => entry.ref).filter(Boolean);
    push(
      {
        id: event.id,
        statement: compact(`${event.title} — ${event.detail}`),
        source: 'agent-event',
        refs,
        trustTier: event.trustTier,
        provenanceRef: `brandops://agent-event/${event.id}`,
        observedAt: event.createdAt
      },
      `${event.title} ${event.detail} ${refs.join(' ')}`
    );
  }

  // ── Twin resume facts ─────────────────────────────────────────────────
  const twin = getActiveDigitalTwin(workspace);
  if (twin) {
    for (const item of twin.resumeProfile.experience) {
      const highlights = item.highlights.join(' ');
      push(
        {
          id: item.id,
          statement: compact(`${item.role} at ${item.organization} (${item.timeframe})`),
          source: 'twin-experience',
          refs: item.highlights.slice(0, 4),
          trustTier: item.verificationStatus === 'verified' ? 'USER_VERIFIED' : 'BRANDOPS_VERIFIED',
          provenanceRef: `brandops://twin/${twin.id}/experience/${item.id}`,
          observedAt: twin.updatedAt
        },
        `${item.role} ${item.organization} ${highlights}`
      );
    }
    for (const project of twin.resumeProfile.projects) {
      push(
        {
          id: project.id,
          statement: compact(project.name),
          source: 'twin-project',
          refs: [],
          trustTier: 'BRANDOPS_VERIFIED',
          provenanceRef: `brandops://twin/${twin.id}/project/${project.id}`,
          observedAt: twin.updatedAt
        },
        `${project.name} ${JSON.stringify(project)}`
      );
    }
    for (const certification of twin.resumeProfile.certifications) {
      push(
        {
          id: `cert-${certification.slice(0, 24)}`,
          statement: compact(certification),
          source: 'twin-certification',
          refs: [],
          trustTier: 'BRANDOPS_VERIFIED',
          provenanceRef: `brandops://twin/${twin.id}/certification`,
          observedAt: twin.updatedAt
        },
        certification
      );
    }
  }

  // ── Execution receipts — proof that work actually ran ──────────────────
  for (const receipt of workspace.planWorkspace?.receipts ?? []) {
    push(
      {
        id: receipt.id,
        statement: compact(receipt.summary),
        source: 'receipt',
        refs: [receipt.planId].filter(Boolean),
        trustTier: 'BRANDOPS_VERIFIED',
        provenanceRef: `brandops://receipt/${receipt.id}`,
        observedAt: receipt.timestamp
      },
      `${receipt.summary} ${receipt.planType ?? ''} ${receipt.userAction ?? ''}`
    );
  }

  hits.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const top = hits.slice(0, capped);

  const limitations = [
    'Searches evidence recorded inside this workspace only — no live web or third-party corroboration.',
    'Lexical matching: a hit means the claim shares terms with the evidence, not that the evidence proves the claim.'
  ];
  if (unsearchable) {
    limitations.push(
      'The claim contained no searchable terms, so nothing was matched against it. ' +
        'Treat the claim as unsupported and restate it with specifics.'
    );
  } else if (!top.length) {
    limitations.push('No stored evidence matched this claim. Treat the claim as unsupported.');
  }

  return {
    claim: query,
    hits: top,
    verifiedCount: top.filter(
      (hit) => hit.trustTier === 'USER_VERIFIED' || hit.trustTier === 'BRANDOPS_VERIFIED'
    ).length,
    agentReportedCount: top.filter((hit) => hit.trustTier === 'AGENT_REPORTED').length,
    limitations,
    searchedSources: [...searched],
    generatedAt: now
  };
}
