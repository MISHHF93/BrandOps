/**
 * AI Red-Team Corpus — Adversarial Tests
 *
 * P0-11 from BRANDOPS_NEXT_CAPABILITIES.md.
 *
 * These tests exercise the red-team corpus attack payloads against the memory firewall
 * and other defense mechanisms. They verify that the system detects and handles each attack.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  processThroughFirewall,
  resetFirewall,
  initializeFirewall,
} from '../../src/services/memory/memoryFirewall';
import {
  RED_TEAM_CORPUS,
  payloadsByCategory,
  criticalAndHighPayloads,
  firewallTestPayloads,
  instructionRiskTestPayloads,
  shouldBeCaughtBy,
} from '../../src/services/redTeam/redTeamCorpus';
import type { AttackCategory, AttackSeverity } from '../../src/services/redTeam/redTeamCorpus';

// ---------------------------------------------------------------------------
// Corpus Overview Tests
// ---------------------------------------------------------------------------

describe('Red-Team Corpus — Overview', () => {
  it('has 25 attack payloads', () => {
    expect(RED_TEAM_CORPUS).toHaveLength(25);
  });

  it('covers all 8 attack categories', () => {
    const categories = [
      'indirect-prompt-injection',
      'malicious-résumé',
      'poisoned-repository',
      'tool-output-injection',
      'memory-poisoning',
      'privilege-escalation',
      'deceptive-external-agent',
      'approval-bypass',
    ];

    for (const cat of categories) {
      const payloads = payloadsByCategory(cat as AttackCategory);
      expect(payloads.length).toBeGreaterThan(0);
      payloads.forEach((p) => expect(p.category).toBe(cat));
    }
  });

  it('has payloads across all severity levels', () => {
    const bySeverity = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const p of RED_TEAM_CORPUS) {
      bySeverity[p.severity]++;
    }

    expect(bySeverity.critical).toBeGreaterThan(0);
    expect(bySeverity.high).toBeGreaterThan(0);
    expect(bySeverity.medium).toBeGreaterThan(0);
  });

  it('critical and high payloads are the majority', () => {
    const criticalHigh = criticalAndHighPayloads();
    expect(criticalHigh.length).toBeGreaterThan(RED_TEAM_CORPUS.length / 2);
  });

  it('firewall test payloads are well-represented', () => {
    const firewallPayloads = firewallTestPayloads();
    expect(firewallPayloads.length).toBeGreaterThan(10);
  });

  it('instruction risk test payloads cover diverse patterns', () => {
    const riskPayloads = instructionRiskTestPayloads();
    expect(riskPayloads.length).toBeGreaterThan(8);
  });
});

// ---------------------------------------------------------------------------
// Memory Firewall Tests Against Corpus
// ---------------------------------------------------------------------------

describe('Red-Team Corpus — Memory Firewall Defense', () => {
  beforeEach(() => {
    resetFirewall();
    // Initialize with blockedSources: [] so instruction risk detection can be tested
    // independently of source blocking. Source blocking is a separate concern.
    initializeFirewall({ blockedSources: [] });
  });

  // Critical attacks that should be caught

  it('atta-001: Indirect injection via achievement report is caught', () => {
    const payload = RED_TEAM_CORPUS[0];
    const result = processThroughFirewall({
      content: payload.payload,
      source: 'agent-event',
      sourceLabel: 'achievement-report',
    });

    expect(result.candidate.instructionRisk).toBe('high');
    expect(result.requiresVerification).toBe(true);
    expect(result.action).toBe('verify');
    expect(result.candidate.trustClassification).toBe('AGENT_REPORTED');
  });

  it('atta-003: Résumé with hidden instruction is caught', () => {
    const payload = RED_TEAM_CORPUS[2];
    const result = processThroughFirewall({
      content: payload.payload,
      source: 'document',
      sourceLabel: 'resume.pdf',
    });

    expect(result.candidate.instructionRisk).toBe('high');
    expect(result.requiresVerification).toBe(true);
    expect(result.action).toBe('verify');
  });

  it('atta-008: Repository README with hidden instructions is caught', () => {
    const payload = RED_TEAM_CORPUS[7];
    const result = processThroughFirewall({
      content: payload.payload,
      source: 'repository',
      sourceLabel: 'github.com/awesome-lib',
    });

    expect(result.candidate.instructionRisk).toBe('high');
    expect(result.requiresVerification).toBe(true);
    expect(result.action).toBe('verify');
  });

  it('atta-011: MCP tool output with injection is caught', () => {
    const payload = RED_TEAM_CORPUS[10];
    const result = processThroughFirewall({
      content: payload.payload,
      source: 'mcp-response',
      sourceLabel: 'auth-tool',
    });

    expect(result.candidate.instructionRisk).toBe('high');
    expect(result.requiresVerification).toBe(true);
    expect(result.action).toBe('verify');
  });

  it('atta-014: Agent event memory poisoning is caught', () => {
    const payload = RED_TEAM_CORPUS[13];
    const result = processThroughFirewall({
      content: payload.payload,
      source: 'agent-event',
      sourceLabel: 'claude-code-session',
    });

    expect(result.candidate.instructionRisk).toBe('high');
    expect(result.requiresVerification).toBe(true);
    expect(result.action).toBe('verify');
  });

  it('atta-023: Approval bypass instruction is caught', () => {
    const payload = RED_TEAM_CORPUS[22];
    const result = processThroughFirewall({
      content: payload.payload,
      source: 'agent-proposal',
      sourceLabel: 'proposal-agent',
    });

    expect(result.candidate.instructionRisk).toBe('high');
    expect(result.requiresVerification).toBe(true);
    expect(result.action).toBe('verify');
  });

  // High severity attacks

  it('atta-002: Content draft injection is caught', () => {
    const payload = RED_TEAM_CORPUS[1];
    const result = processThroughFirewall({
      content: payload.payload,
      source: 'agent-proposal',
      sourceLabel: 'content-draft',
    });

    expect(result.candidate.instructionRisk).toBe('high');
    expect(result.requiresVerification).toBe(true);
  });

  it('atta-004: AI-generated bio with bias is caught', () => {
    const payload = RED_TEAM_CORPUS[3];
    const result = processThroughFirewall({
      content: payload.payload,
      source: 'model-output',
      sourceLabel: 'ai-bio-generator',
    });

    expect(result.candidate.instructionRisk).toBe('high');
    expect(result.requiresVerification).toBe(true);
  });

  it('atta-009: CONTRIBUTING file manipulation is caught', () => {
    const payload = RED_TEAM_CORPUS[8];
    const result = processThroughFirewall({
      content: payload.payload,
      source: 'repository',
      sourceLabel: 'github.com/lib',
    });

    expect(result.candidate.instructionRisk).toBe('high');
    expect(result.requiresVerification).toBe(true);
  });

  it('atta-012: Web search result injection is caught', () => {
    const payload = RED_TEAM_CORPUS[11];
    const result = processThroughFirewall({
      content: payload.payload,
      source: 'webpage',
      sourceLabel: 'search-result',
    });

    expect(result.candidate.instructionRisk).toBe('high');
    expect(result.requiresVerification).toBe(true);
  });

  it('atta-015: Twin delta memory poisoning is caught', () => {
    const payload = RED_TEAM_CORPUS[14];
    const result = processThroughFirewall({
      content: payload.payload,
      source: 'twin-delta',
      sourceLabel: 'twin-delta-engine',
    });

    expect(result.candidate.instructionRisk).toBe('high');
    expect(result.requiresVerification).toBe(true);
  });

  // Medium severity — some should pass through

  it('atta-006: Résumé with hidden negative traits passes firewall (not instruction-like)', () => {
    const payload = RED_TEAM_CORPUS[5];
    const result = processThroughFirewall({
      content: payload.payload,
      source: 'integration-import',
      sourceLabel: 'resume.pdf',
    });

    // This payload doesn't have instruction-like patterns, so it should pass
    // But it should be flagged as EXTERNAL_SOURCE requiring verification
    expect(result.candidate.instructionRisk).toBe('none');
    expect(result.candidate.trustClassification).toBe('EXTERNAL_SOURCE');
    expect(result.requiresVerification).toBe(true); // Because it's external source
  });

  // Benign content should pass

  it('benign résumé passes firewall (no injection)', () => {
    const result = processThroughFirewall({
      content: 'John Doe — Senior Software Engineer. 10 years experience. Built distributed systems at scale.',
      source: 'user-input',
      sourceLabel: 'manual-entry',
    });

    expect(result.action).toBe('promote');
    expect(result.requiresVerification).toBe(false);
    expect(result.candidate.instructionRisk).toBe('none');
  });
});

// ---------------------------------------------------------------------------
// Category-Specific Tests
// ---------------------------------------------------------------------------

describe('Red-Team Corpus — Category Defense Coverage', () => {
  beforeEach(() => {
    resetFirewall();
    initializeFirewall();
  });

  describe('Indirect Prompt Injection', () => {
    const payloads = payloadsByCategory('indirect-prompt-injection');

    it('all 4 payloads trigger instruction risk detection', () => {
      for (const payload of payloads) {
        const result = processThroughFirewall({
          content: payload.payload,
          source: 'agent-event',
          sourceLabel: 'test',
        });
        expect(result.candidate.instructionRisk).toBe('high');
        expect(result.requiresVerification).toBe(true);
      }
    });

    it('all 4 payloads are caught by firewall', () => {
      for (const payload of payloads) {
        // Corpus metadata: these payloads are designed to be caught by the firewall
        expect(payload.shouldBeCaughtByFirewall).toBe(true);
        // Also verify the firewall actually catches them
        const result = processThroughFirewall({
          content: payload.payload,
          source: 'agent-event',
          sourceLabel: 'test',
        });
        expect(result.allowed).toBe(true); // They're allowed into candidate memory for verification
        expect(result.candidate.instructionRisk).toBe('high');
      }
    });
  });

  describe('Poisoned Repository', () => {
    const payloads = payloadsByCategory('poisoned-repository');

    it('all 3 payloads trigger instruction risk detection', () => {
      for (const payload of payloads) {
        // Use integration-import source so content passes through firewall
        // (repository source is blocked by default — source blocking is tested separately)
        const result = processThroughFirewall({
          content: payload.payload,
          source: 'integration-import',
          sourceLabel: 'test-repo',
        });
        expect(result.candidate.instructionRisk).toBe('high');
        expect(result.requiresVerification).toBe(true);
      }
    });
  });

  describe('Tool Output Injection', () => {
    const payloads = payloadsByCategory('tool-output-injection');

    it('all 3 payloads trigger instruction risk detection', () => {
      for (const payload of payloads) {
        const result = processThroughFirewall({
          content: payload.payload,
          source: 'integration-import',
          sourceLabel: 'test-tool',
        });
        expect(result.candidate.instructionRisk).toBe('high');
        expect(result.requiresVerification).toBe(true);
      }
    });
  });

  describe('Memory Poisoning', () => {
    const payloads = payloadsByCategory('memory-poisoning');

    it('all 3 payloads trigger instruction risk detection', () => {
      for (const payload of payloads) {
        const source = payload.target.includes('Twin Delta') ? 'twin-delta' :
                       payload.target.includes('Professional Signal') ? 'agent-proposal' :
                       'agent-event';

        const result = processThroughFirewall({
          content: payload.payload,
          source,
          sourceLabel: 'test',
        });
        expect(result.candidate.instructionRisk).toBe('high');
        expect(result.requiresVerification).toBe(true);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Defense Effectiveness Tests
// ---------------------------------------------------------------------------

describe('Red-Team Corpus — Defense Effectiveness', () => {
  beforeEach(() => {
    resetFirewall();
    initializeFirewall();
  });

  it('shouldBeCaughtBy correctly identifies firewall defense', () => {
    const payload = RED_TEAM_CORPUS[0]; // atta-001
    expect(shouldBeCaughtBy(payload, 'Memory Firewall')).toBe(true);
    expect(shouldBeCaughtBy(payload, 'firewall')).toBe(true);
    expect(shouldBeCaughtBy(payload, 'instruction risk')).toBe(true);
  });

  it('shouldBeCaughtBy correctly identifies non-firewall defenses', () => {
    const payload = RED_TEAM_CORPUS[16]; // atta-017 — privilege escalation
    expect(shouldBeCaughtBy(payload, 'firewall')).toBe(false);
    // atta-017's expected defense now includes "Trust Levels / Agent Identity"
    expect(shouldBeCaughtBy(payload, 'Trust Levels')).toBe(true);
    expect(shouldBeCaughtBy(payload, 'Agent Identity')).toBe(true);
    expect(shouldBeCaughtBy(payload, 'trust')).toBe(true);
  });

  it('corpus correctly labels which payloads should be caught by firewall', () => {
    const firewallPayloads = firewallTestPayloads();

    for (const payload of firewallPayloads) {
      expect(payload.shouldBeCaughtByFirewall).toBe(true);
    }
  });

  it('corpus correctly labels which payloads should trigger instruction risk', () => {
    const riskPayloads = instructionRiskTestPayloads();

    for (const payload of riskPayloads) {
      expect(payload.shouldTriggerInstructionRisk).toBe(true);
    }
  });

  it('non-firewall payloads (privilege escalation, deceptive agents) are correctly excluded', () => {
    const nonFirewallCategories: AttackCategory[] = [
      'privilege-escalation',
      'deceptive-external-agent',
      'approval-bypass',
    ];

    for (const cat of nonFirewallCategories) {
      const payloads = payloadsByCategory(cat);
      for (const payload of payloads) {
        // These should NOT be caught by the firewall (they are handled by other systems)
        if (payload.target.includes('Agent Identity') || payload.target.includes('Trust Levels') || payload.target.includes('Session')) {
          expect(payload.shouldBeCaughtByFirewall).toBe(false);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Full Corpus Regression Test
// ---------------------------------------------------------------------------

describe('Red-Team Corpus — Full Regression', () => {
  beforeEach(() => {
    resetFirewall();
    initializeFirewall();
  });

  it('every payload has a unique id', () => {
    const ids = RED_TEAM_CORPUS.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(RED_TEAM_CORPUS.length);
  });

  it('every payload has a name, category, severity, target, and explanation', () => {
    for (const payload of RED_TEAM_CORPUS) {
      expect(payload.name).toBeDefined();
      expect(payload.name.length).toBeGreaterThan(0);
      expect(payload.category).toBeDefined();
      expect(payload.severity).toBeDefined();
      expect(payload.target).toBeDefined();
      expect(payload.target.length).toBeGreaterThan(0);
      expect(payload.explanation).toBeDefined();
      expect(payload.explanation.length).toBeGreaterThan(0);
    }
  });

  it('every payload has a valid severity', () => {
    const validSeverities: AttackSeverity[] = ['critical', 'high', 'medium', 'low'];
    for (const payload of RED_TEAM_CORPUS) {
      expect(validSeverities).toContain(payload.severity);
    }
  });

  it('payloads are properly typed', () => {
    for (const payload of RED_TEAM_CORPUS) {
      // Verify the payload structure
      expect(typeof payload.id).toBe('string');
      expect(typeof payload.name).toBe('string');
      expect(typeof payload.category).toBe('string');
      expect(typeof payload.severity).toBe('string');
      expect(typeof payload.payload).toBe('string');
      expect(payload.payload.length).toBeGreaterThan(10); // Real payloads are not trivial
      expect(typeof payload.target).toBe('string');
      expect(typeof payload.expectedDefense).toBe('string');
      expect(typeof payload.shouldBeCaughtByFirewall).toBe('boolean');
      expect(typeof payload.shouldTriggerInstructionRisk).toBe('boolean');
      expect(typeof payload.explanation).toBe('string');
    }
  });

  it('corpus covers all attack vectors mentioned in BRANDOPS_NEXT_CAPABILITIES.md', () => {
    // The document mentions: indirect prompt injection, malicious résumé text, poisoned
    // repository instructions, tool-output injection, memory poisoning, privilege escalation
    // requests, deceptive external-agent messages, attempts to bypass approval

    const requiredCategories = [
      'indirect-prompt-injection',
      'malicious-résumé',
      'poisoned-repository',
      'tool-output-injection',
      'memory-poisoning',
      'privilege-escalation',
      'deceptive-external-agent',
      'approval-bypass',
    ];

    for (const cat of requiredCategories) {
      const payloads = payloadsByCategory(cat as AttackCategory);
      expect(payloads.length).toBeGreaterThan(0);
      // Each category should have at least 2 payloads for good coverage
      expect(payloads.length).toBeGreaterThanOrEqual(2);
    }
  });
});
