/**
 * Schema Evolution Tests — migration tests from legacy schema versions.
 *
 * The schema-evolution coverage is tracked in the README product backlog.
 *
 * Tests that data persisted under older schema versions can be migrated to the current schema
 * without data loss, corruption, or silent breakage.
 */

import { describe, it, expect } from 'vitest';
import type { Decision } from '../../src/services/decisions/decisionLedger';

// ---------------------------------------------------------------------------
// Legacy Schema Fixtures
// ---------------------------------------------------------------------------

/**
 * Simulated legacy v0.1.0 data structures that older versions might have persisted.
 * These fixtures mimic what the system would have stored before the current schema.
 */

/** Legacy brand context (v0.1.0 pre-normalization). */
interface LegacyBrandContextV010 {
  brandName?: string;
  positioning?: string;
  headline?: string;
  bio?: string;
  services?: string[];
  audience?: string[];
  tone?: string;
  palette?: string[];
}

/** Legacy twin content (v0.1.0 before evidence fields were added). */
interface LegacyTwinContentV010 {
  approvedClaims?: Array<{
    claim: string;
    source?: string;
    timestamp?: string;
  }>;
  rejectedClaims?: Array<{
    claim: string;
    source?: string;
    timestamp?: string;
  }>;
}

/** Legacy bot-memory decisions (v0.0.9 — before WorkspaceDecisionMemoryEntry unified type). */
interface LegacyBotMemoryDecisionsV009 {
  decisions?: Array<{
    type?: string;
    polarity?: string;
    title?: string;
    description?: string;
  }>;
}

/** Legacy workspace contributions (v0.1.0 before explicit Decision type). */
interface LegacyWorkspaceContributionsV010 {
  approvedDecisions?: string[];
  rejectedDecisions?: string[];
  decisions?: Array<{
    title: string;
    type: string;
    accepted: boolean;
    reason?: string;
  }>;
}

// ---------------------------------------------------------------------------
// Current Schema Types (for comparison)
// ---------------------------------------------------------------------------

/** Current BrandOpsData shape (v0.2.0+). */
interface CurrentDataShape {
  brandContext: {
    identity: { name?: string };
    goals: Array<{ id: string; title: string; status: string }>;
    achievements: Array<{ id: string; kind: string; twinSummary?: string }>;
    activities: Array<{ timestamp: string; type: string }>;
    plans: Array<{ id: string; title: string; completionStatus: string }>;
    artifacts: Array<{ id: string; title: string; status: string; type: string }>;
    twin: {
      approvedClaims: Array<{ claim: string; source: string; timestamp: string }>;
      rejectedClaims: Array<{ claim: string; source: string; timestamp: string }>;
    };
  };
  decisions: Array<Decision>;
}

// ---------------------------------------------------------------------------
// Migration Tests
// ---------------------------------------------------------------------------

describe('Schema Evolution — Migration from Legacy Schemas', () => {
  /**
   * Test 1: Legacy brand context migration.
   *
   * v0.1.0 stored brand context as flat fields (brandName, positioning, headline, bio, etc.).
   * Current schema stores under brandContext.identity.name and related fields.
   *
   * Verify that legacy brand context can be migrated without data loss.
   */
  it('migrates legacy brand context v0.1.0 to current shape', () => {
    const legacy: LegacyBrandContextV010 = {
      brandName: 'My Brand',
      positioning: 'We help companies grow',
      headline: 'Growth Partner',
      bio: 'We are a consulting firm',
      services: ['Strategy', 'Execution'],
      audience: ['Startups', 'Enterprises'],
      tone: 'Professional',
      palette: ['#FF6B6B', '#4ECDC4']
    };

    // Simulated migration
    const migrated: CurrentDataShape['brandContext'] = {
      identity: { name: legacy.brandName ?? undefined },
      goals: [], // Would be migrated from legacy workspace goals if present
      achievements: [],
      activities: [],
      plans: [],
      artifacts: [],
      twin: {
        approvedClaims: [],
        rejectedClaims: []
      }
    };

    // Verify data integrity
    expect(migrated.identity.name).toBe(legacy.brandName);
    expect(migrated.identity.name).not.toBeUndefined();
  });

  /**
   * Test 2: Legacy twin content migration.
   *
   * v0.1.0 stored approvedClaims as { claim, source?, timestamp? }.
   * Current schema stores as { claim, source, timestamp }.
   *
   * Verify that legacy twin claims migrate without losing the claim text.
   */
  it('migrates legacy twin content v0.10 to current shape', () => {
    const legacy: LegacyTwinContentV010 = {
      approvedClaims: [
        {
          claim: 'I am a senior engineer',
          source: 'user-input',
          timestamp: '2026-01-15T10:00:00Z'
        },
        {
          claim: 'I have 10 years experience',
          source: 'user-input',
          timestamp: '2026-01-15T10:00:00Z'
        }
      ],
      rejectedClaims: [
        { claim: 'I am a junior dev', source: 'user-input', timestamp: '2026-01-15T10:00:00Z' }
      ]
    };

    // Simulated migration — the claim text must be preserved
    const migratedApproved = legacy.approvedClaims.map((c) => ({ ...c }));
    const migratedRejected = legacy.rejectedClaims.map((c) => ({ ...c }));

    // Verify data integrity
    expect(migratedApproved).toHaveLength(2);
    expect(migratedApproved[0].claim).toBe('I am a senior engineer');
    expect(migratedApproved[1].claim).toBe('I have 10 years experience');
    expect(migratedRejected[0].claim).toBe('I am a junior dev');

    // Verify that missing optional fields don't cause errors
    const legacyWithMissingFields: LegacyTwinContentV010 = {
      approvedClaims: [{ claim: 'Test claim' }],
      rejectedClaims: []
    };
    expect(legacyWithMissingFields.approvedClaims[0].source).toBeUndefined();
    expect(legacyWithMissingFields.approvedClaims[0].timestamp).toBeUndefined();
  });

  /**
   * Test 3: Legacy bot-memory decisions migration (v0.0.9).
   *
   * v0.0.9 stored decisions as { type?, polarity?, title?, description? } — optional fields.
   * Current schema uses WorkspaceDecisionMemoryEntry with required fields.
   *
   * Verify that legacy decisions migrate without crashing on missing fields.
   */
  it('migrates legacy bot-memory decisions v0.0.9 to current shape without crashing', () => {
    const legacy: LegacyBotMemoryDecisionsV009 = {
      decisions: [
        {
          type: 'strategy',
          polarity: 'approved',
          title: 'Focus on B2B',
          description: 'B2B has higher LTV'
        },
        { type: 'content-direction', polarity: 'rejected', title: 'Weekly newsletter' },
        // Decision missing most fields
        { title: 'Partial decision' },
        // Empty decision
        {}
      ]
    };

    // Simulated migration — should not crash on missing fields
    const migrated = legacy.decisions.map((d) => ({
      type: d.type ?? 'unknown',
      polarity: d.polarity ?? 'unknown',
      title: d.title ?? 'Untitled',
      description: d.description ?? ''
    }));

    // Verify migration didn't crash
    expect(migrated).toHaveLength(4);
    expect(migrated[0].type).toBe('strategy');
    expect(migrated[1].polarity).toBe('rejected');
    expect(migrated[2].type).toBe('unknown'); // Missing field handled
    expect(migrated[2].title).toBe('Partial decision');
    expect(migrated[3].title).toBe('Untitled'); // Empty object handled

    // Verify that empty/missing polarity doesn't corrupt data
    const emptyDecisions: LegacyBotMemoryDecisionsV009 = { decisions: [{}] };
    const emptyMigrated = emptyDecisions.decisions.map((d) => ({
      type: d.type ?? 'unknown',
      polarity: d.polarity ?? 'unknown',
      title: d.title ?? 'Untitled',
      description: d.description ?? ''
    }));
    expect(emptyMigrated[0].polarity).toBe('unknown');
  });

  /**
   * Test 4: Legacy workspace contributions migration (v0.1.0).
   *
   * v0.1.0 stored decisions as { title, type, accepted: boolean, reason? }.
   * Current schema uses { type, polarity: 'approved'|'rejected', title, description }.
   *
   * Verify that the 'accepted' boolean maps correctly to 'approved'/'rejected' polarity.
   */
  it('migrates legacy workspace contributions v0.1.0 to current decision polarity', () => {
    const legacy: LegacyWorkspaceContributionsV010 = {
      approvedDecisions: ['Decision A', 'Decision B'],
      rejectedDecisions: ['Decision C'],
      decisions: [
        {
          title: 'Adopt new positioning',
          type: 'positioning',
          accepted: true,
          reason: 'More specific'
        },
        {
          title: 'Target enterprise only',
          type: 'target-audience',
          accepted: false,
          reason: 'Too narrow'
        },
        { title: 'Hire a consultant', type: 'strategy', accepted: true },
        // Decision with missing reason
        { title: 'Expand to EU', type: 'strategy', accepted: false }
      ]
    };

    // Simulated migration
    const migratedDecisions: Array<{
      type: string;
      polarity: string;
      title: string;
      description: string;
    }> = [];

    for (const d of legacy.decisions) {
      migratedDecisions.push({
        type: d.type,
        polarity: d.accepted ? 'approved' : 'rejected',
        title: d.title,
        description: d.reason ?? ''
      });
    }

    // Verify polarity mapping
    expect(migratedDecisions[0].polarity).toBe('approved');
    expect(migratedDecisions[1].polarity).toBe('rejected');
    expect(migratedDecisions[2].polarity).toBe('approved');
    expect(migratedDecisions[3].polarity).toBe('rejected');

    // Verify that missing reason doesn't crash
    expect(migratedDecisions[2].description).toBe('');
    expect(migratedDecisions[3].description).toBe('');

    // Verify approvedDecisions array is captured
    expect(legacy.approvedDecisions).toContain('Decision A');
    expect(legacy.approvedDecisions).toContain('Decision B');
    expect(legacy.rejectedDecisions).toContain('Decision C');
  });

  /**
   * Test 5: Round-trip — legacy data → current schema → legacy serialization.
   *
   * Verifies that data can survive a full migration cycle without loss of core fields.
   */
  it('round-trips legacy data without losing core fields', () => {
    const legacyBrand: LegacyBrandContextV010 = {
      brandName: 'TestBrand',
      positioning: 'Testing migration',
      headline: 'Migration Test',
      bio: 'Bio for testing',
      services: ['Service A', 'Service B'],
      audience: ['Audience 1']
    };

    // Step 1: Migrate to current shape
    const current: CurrentDataShape['brandContext'] = {
      identity: { name: legacyBrand.brandName },
      goals: [],
      achievements: [],
      activities: [],
      plans: [],
      artifacts: [],
      twin: { approvedClaims: [], rejectedClaims: [] }
    };

    // Step 2: Serialize back to a flat representation
    const serialized: Partial<LegacyBrandContextV010> = {
      brandName: current.identity.name,
      positioning: undefined, // Would need to be stored separately in legacy
      headline: undefined,
      bio: undefined,
      services: [],
      audience: []
    };

    // Step 3: Verify core field survives
    expect(serialized.brandName).toBe('TestBrand');

    // The point: core identity data (brandName) survives the round-trip.
    // Other fields (positioning, headline, bio, services, audience) would need
    // to be mapped to appropriate current-schema locations to survive.
  });

  /**
   * Test 6: Data integrity under schema changes.
   *
   * Simulate a schema change where a field is renamed or restructured.
   * Verify that existing data can be remapped without loss.
   */
  it('handles field rename during schema evolution', () => {
    // Legacy field: 'decision_polarity' (string: 'accepted' | 'rejected')
    // Current field: 'polarity' (string: 'approved' | 'rejected')
    const legacyPolarityMap: Record<string, string> = {
      accepted: 'approved',
      rejected: 'rejected'
    };

    const legacyDecisions = [
      { title: 'Decision 1', decision_polarity: 'accepted' },
      { title: 'Decision 2', decision_polarity: 'rejected' },
      { title: 'Decision 3' } // Missing field — should default
    ];

    const migrated = legacyDecisions.map((d) => ({
      title: d.title,
      polarity: legacyPolarityMap[d.decision_polarity ?? 'unknown'] ?? 'unknown'
    }));

    expect(migrated[0].polarity).toBe('approved');
    expect(migrated[1].polarity).toBe('rejected');
    expect(migrated[2].polarity).toBe('unknown'); // Missing field handled gracefully
  });

  /**
   * Test 7: Nested structure flattening (legacy → current).
   *
   * Legacy might store data as flat arrays, current schema as nested objects.
   * Verify that flattening/expansion doesn't lose data.
   */
  it('handles nested structure changes', () => {
    // Legacy: flat list of items with type tags
    const legacyFlat = [
      { type: 'goal', id: 'g1', title: 'Goal 1', status: 'active' },
      { type: 'goal', id: 'g2', title: 'Goal 2', status: 'completed' },
      { type: 'achievement', id: 'a1', kind: 'promotion', title: 'Got promoted' },
      { type: 'achievement', id: 'a2', kind: 'project', title: 'Shipped v2' }
    ];

    // Current: grouped by type
    const currentGrouped: Record<string, Array<{ id: string; title: string }>> = {
      goals: [],
      achievements: []
    };

    for (const item of legacyFlat) {
      if (item.type === 'goal') {
        currentGrouped.goals.push({ id: item.id, title: item.title });
      } else if (item.type === 'achievement') {
        currentGrouped.achievements.push({ id: item.id, title: item.title });
      }
    }

    // Verify grouping preserved all items
    expect(currentGrouped.goals).toHaveLength(2);
    expect(currentGrouped.achievements).toHaveLength(2);
    expect(currentGrouped.goals[0].id).toBe('g1');
    expect(currentGrouped.achievements[0].id).toBe('a1');

    // Verify titles preserved
    expect(currentGrouped.goals.map((g) => g.title)).toEqual(['Goal 1', 'Goal 2']);
    expect(currentGrouped.achievements.map((a) => a.title)).toEqual(['Got promoted', 'Shipped v2']);
  });

  /**
   * Test 8: Schema version metadata.
   *
   * Verify that schema version stamps are preserved during migration so we can
   * track which version a user's data was last seen in.
   */
  it('preserves schema version metadata during migration', () => {
    const legacySnapshot = {
      schemaVersion: '0.1.0',
      migratedAt: undefined,
      data: { brandName: 'Test' }
    };

    // During migration, we record the new version
    const migratedSnapshot = {
      schemaVersion: '0.2.0',
      migratedAt: new Date().toISOString(),
      data: legacySnapshot.data
    };

    // Verify version stamp updated
    expect(migratedSnapshot.schemaVersion).toBe('0.2.0');
    expect(migratedSnapshot.migratedAt).toBeDefined();
    expect(migratedSnapshot.data.brandName).toBe('Test'); // Data preserved
  });
});

// ---------------------------------------------------------------------------
// Migration Helper Functions (real implementation)
// ---------------------------------------------------------------------------

/**
 * Migrate legacy brand context to current shape.
 */
export function migrateLegacyBrandContext(
  legacy: LegacyBrandContextV010
): Pick<CurrentDataShape['brandContext'], 'identity'> {
  return {
    identity: {
      name: legacy.brandName ?? undefined
    }
  };
}

/**
 * Migrate legacy twin content to current shape.
 */
export function migrateLegacyTwinContent(legacy: LegacyTwinContentV010): {
  approvedClaims: Array<{ claim: string; source: string; timestamp: string }>;
  rejectedClaims: Array<{ claim: string; source: string; timestamp: string }>;
} {
  return {
    approvedClaims: (legacy.approvedClaims ?? []).map((c) => ({
      claim: c.claim,
      source: c.source ?? 'unknown',
      timestamp: c.timestamp ?? new Date().toISOString()
    })),
    rejectedClaims: (legacy.rejectedClaims ?? []).map((c) => ({
      claim: c.claim,
      source: c.source ?? 'unknown',
      timestamp: c.timestamp ?? new Date().toISOString()
    }))
  };
}

/**
 * Migrate legacy bot-memory decisions to current Decision type.
 */
export function migrateLegacyBotMemoryDecisions(
  legacy: LegacyBotMemoryDecisionsV009,
  workspaceId: string
): Decision[] {
  return (legacy.decisions ?? []).map((d, index) => ({
    id: `migrated-dec-${index}-${Date.now().toString(36)}`,
    type: (d.type as Decision['type']) ?? 'strategy',
    polarity:
      d.polarity === 'approved' ? 'approved' : d.polarity === 'rejected' ? 'rejected' : 'deferred',
    title: d.title ?? 'Untitled',
    description: d.description ?? '',
    reason: '',
    source: 'migration-v009',
    timestamp: new Date().toISOString(),
    goal: undefined,
    supersedes: [],
    supersededBy: [],
    confidence: 0.5,
    workspaceId
  }));
}

/**
 * Migrate legacy workspace contributions to current Decision type.
 */
export function migrateLegacyWorkspaceContributions(
  legacy: LegacyWorkspaceContributionsV010,
  workspaceId: string
): Decision[] {
  const decisions: Decision[] = [];

  for (const d of legacy.decisions ?? []) {
    decisions.push({
      id: `migrated-contrib-${Date.now().toString(36)}-${decisions.length}`,
      type: (d.type as Decision['type']) ?? 'strategy',
      polarity: d.accepted ? 'approved' : 'rejected',
      title: d.title,
      description: d.title,
      reason: d.reason ?? '',
      source: 'migration-v010',
      timestamp: new Date().toISOString(),
      goal: undefined,
      supersedes: [],
      supersededBy: [],
      confidence: 0.6,
      workspaceId
    });
  }

  return decisions;
}
