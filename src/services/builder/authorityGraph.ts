/**
 * Authority Graph — what this workspace can actually substantiate, and where
 * claimed positioning outruns demonstrated proof.
 *
 * Honest scope, stated up front: BrandOps observes *owned* evidence — the Twin,
 * projects, achievements, activity, receipts. It has no third-party citation
 * feed, so this measures **substantiation**, not public reputation. A topic can
 * score HIGH here and still be invisible to the outside world; that discrepancy
 * is exactly what `gaps` reports, and every readout carries the caveat so a
 * consuming AI cannot mistake one for the other.
 */
import type { BrandOpsData } from '../../types/domain';
import { getActiveDigitalTwin } from '../digitalTwin/digitalTwin';

export type AuthorityLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'EMERGING' | 'UNSUPPORTED';

export interface AuthorityTopic {
  topic: string;
  level: AuthorityLevel;
  /** 0–100 substantiation score from owned evidence. */
  score: number;
  /** Evidence the user or BrandOps verified. */
  verifiedEvidenceCount: number;
  /** Evidence an agent or detector proposed but nobody confirmed. */
  unverifiedEvidenceCount: number;
  /** Evidence that exists outside BrandOps and could be independently checked. */
  externallyCheckableCount: number;
  /** Short citable statements behind the score. */
  supportingEvidence: string[];
  /** Where the topic was asserted (positioning, skills, projects). */
  claimedIn: string[];
}

export interface AuthorityGap {
  topic: string;
  /** What the workspace claims. */
  claimed: string;
  /** What the evidence actually shows. */
  observed: string;
  severity: 'critical' | 'high' | 'medium';
  recommendedActions: string[];
}

export interface AuthorityGraphReadout {
  topics: AuthorityTopic[];
  gaps: AuthorityGap[];
  headline: string;
  /** What this readout cannot tell you. Always non-empty. */
  limitations: string[];
  generatedAt: string;
}

const MAX_TOPICS = 24;
const MAX_SUPPORTING = 5;

function normalizeTopic(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function topicKey(value: string): string {
  return normalizeTopic(value).toLowerCase();
}

function mentions(topic: string, haystack: string): boolean {
  const key = topicKey(topic);
  if (key.length < 3) return false;
  return haystack.toLowerCase().includes(key);
}

function levelFor(score: number, externallyCheckable: number): AuthorityLevel {
  if (score >= 70 && externallyCheckable > 0) return 'HIGH';
  if (score >= 45) return 'MEDIUM';
  if (score >= 20) return 'LOW';
  if (score > 0) return 'EMERGING';
  return 'UNSUPPORTED';
}

/**
 * Build the authority graph for a workspace. Pure over `BrandOpsData` — no
 * network, no mutation — so the same readout can serve the UI, the daily loop,
 * and the MCP gateway without any of them re-deriving it.
 */
export function buildAuthorityGraph(workspace: BrandOpsData): AuthorityGraphReadout {
  const generatedAt = new Date().toISOString();
  const twin = getActiveDigitalTwin(workspace);

  // ── Candidate topics: what the workspace claims to be about ───────────
  const claimed = new Map<string, Set<string>>();
  const claim = (topic: string, where: string) => {
    const normalized = normalizeTopic(topic);
    if (normalized.length < 3) return;
    const key = topicKey(normalized);
    const entry = claimed.get(key) ?? new Set<string>();
    entry.add(where);
    claimed.set(key, entry);
  };

  if (twin) {
    for (const skill of twin.resumeProfile.skills) claim(skill, 'twin/skills');
    for (const industry of twin.resumeProfile.industries) claim(industry, 'twin/industries');
    for (const tool of twin.resumeProfile.tools) claim(tool, 'twin/tools');
    for (const keyword of twin.resumeProfile.keywords) claim(keyword, 'twin/keywords');
    for (const differentiator of twin.identity.differentiators)
      claim(differentiator, 'twin/positioning');
  }
  for (const project of workspace.builderActivity?.projects ?? []) {
    for (const tag of project.tags ?? []) claim(tag, 'project/tags');
  }

  // ── Evidence corpus, each item tagged verified / externally checkable ──
  interface EvidenceUnit {
    text: string;
    statement: string;
    verified: boolean;
    externallyCheckable: boolean;
  }
  const corpus: EvidenceUnit[] = [];

  for (const achievement of workspace.builderActivity?.achievements ?? []) {
    if (achievement.dismissed) continue;
    const refs = (achievement.evidence ?? []).map((entry) => entry.ref);
    corpus.push({
      text: `${achievement.title} ${achievement.description} ${achievement.professionalRelevance.join(' ')} ${refs.join(' ')}`,
      statement: normalizeTopic(achievement.title).slice(0, 160),
      verified: Boolean(achievement.verifiedAt),
      externallyCheckable: (achievement.evidence ?? []).some(
        (entry) =>
          Boolean(entry.verificationUrl) || entry.kind === 'link' || entry.kind === 'release'
      )
    });
  }

  for (const event of workspace.builderActivity?.events ?? []) {
    if (!event.evidence?.length) continue;
    corpus.push({
      text: `${event.title} ${event.detail} ${event.evidence.map((entry) => entry.ref).join(' ')}`,
      statement: normalizeTopic(event.title).slice(0, 160),
      verified: event.trustTier === 'USER_VERIFIED' || event.trustTier === 'BRANDOPS_VERIFIED',
      externallyCheckable: event.evidence.some((entry) => Boolean(entry.verificationUrl))
    });
  }

  for (const project of workspace.builderActivity?.projects ?? []) {
    corpus.push({
      text: `${project.name} ${project.summary} ${(project.tags ?? []).join(' ')}`,
      statement: `Project: ${normalizeTopic(project.name).slice(0, 140)}`,
      verified: true,
      // Only an authorized external reference is something a third party could check.
      externallyCheckable: (project.externalRefs ?? []).some((ref) => ref.authorized)
    });
  }

  if (twin) {
    for (const item of twin.resumeProfile.experience) {
      corpus.push({
        text: `${item.role} ${item.organization} ${item.highlights.join(' ')}`,
        statement: `${item.role} at ${item.organization}`,
        verified: item.verificationStatus === 'verified',
        externallyCheckable: false
      });
    }
  }

  // ── Score each claimed topic against the corpus ────────────────────────
  const topics: AuthorityTopic[] = [];
  for (const [key, sources] of claimed) {
    let verifiedEvidenceCount = 0;
    let unverifiedEvidenceCount = 0;
    let externallyCheckableCount = 0;
    const supportingEvidence: string[] = [];

    for (const unit of corpus) {
      if (!mentions(key, unit.text)) continue;
      if (unit.verified) verifiedEvidenceCount += 1;
      else unverifiedEvidenceCount += 1;
      if (unit.externallyCheckable) externallyCheckableCount += 1;
      if (supportingEvidence.length < MAX_SUPPORTING) supportingEvidence.push(unit.statement);
    }

    // Verified evidence carries the score; unverified contributes a little;
    // externally checkable proof is what separates "we know" from "we can show".
    const score = Math.min(
      100,
      verifiedEvidenceCount * 22 + unverifiedEvidenceCount * 7 + externallyCheckableCount * 14
    );

    topics.push({
      topic: normalizeTopic(key),
      level: levelFor(score, externallyCheckableCount),
      score,
      verifiedEvidenceCount,
      unverifiedEvidenceCount,
      externallyCheckableCount,
      supportingEvidence,
      claimedIn: [...sources]
    });
  }

  topics.sort((a, b) => b.score - a.score || a.topic.localeCompare(b.topic));
  const ranked = topics.slice(0, MAX_TOPICS);

  // ── Gaps: claimed but not substantiated, or known but not showable ─────
  const gaps: AuthorityGap[] = [];
  for (const topic of ranked) {
    if (topic.level === 'UNSUPPORTED') {
      gaps.push({
        topic: topic.topic,
        claimed: `Asserted in ${topic.claimedIn.join(', ')}`,
        observed: 'No stored evidence mentions this topic.',
        severity: 'critical',
        recommendedActions: [
          `Record concrete work that demonstrates ${topic.topic}, or drop the claim.`,
          'Attach a citable reference (repository, release, document) to that work.'
        ]
      });
      continue;
    }
    if (topic.externallyCheckableCount === 0 && topic.score > 0) {
      gaps.push({
        topic: topic.topic,
        claimed: `Substantiated internally (score ${topic.score}).`,
        observed: 'No externally checkable proof — nobody outside BrandOps can verify it.',
        severity: topic.score >= 45 ? 'high' : 'medium',
        recommendedActions: [
          `Publish something durable about ${topic.topic} and link it as evidence.`,
          'Add a verification URL to the strongest existing evidence item.'
        ]
      });
      continue;
    }
    if (topic.verifiedEvidenceCount === 0 && topic.unverifiedEvidenceCount > 0) {
      gaps.push({
        topic: topic.topic,
        claimed: `Supported only by ${topic.unverifiedEvidenceCount} unverified item(s).`,
        observed: 'Nothing behind this topic has been confirmed by the user.',
        severity: 'high',
        recommendedActions: [`Review and verify the pending evidence for ${topic.topic}.`]
      });
    }
  }

  const strong = ranked.filter((topic) => topic.level === 'HIGH').length;
  const headline = ranked.length
    ? `${strong} topic${strong === 1 ? '' : 's'} substantiated with externally checkable proof; ${gaps.length} corroboration gap${gaps.length === 1 ? '' : 's'}.`
    : 'No claimed topics found. Add skills, positioning, or projects before measuring authority.';

  return {
    topics: ranked,
    gaps,
    headline,
    limitations: [
      'Measures substantiation from evidence owned by this workspace — not public reputation.',
      'No third-party citations, mentions, or search data are consulted.',
      'Topic matching is lexical: a topic scores only where stored evidence names it.'
    ],
    generatedAt
  };
}
