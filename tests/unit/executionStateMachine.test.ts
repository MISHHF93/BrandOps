import { describe, expect, it } from 'vitest';
import {
  EXECUTION_STATE_TERMINAL,
  isValidExecutionTransition,
  permissionTierRequiresApproval,
  classifyOperationalTaskTier
} from '../../src/types/executionState';

describe('executionState machine contract', () => {
  it('validates the canonical EXECUTING -> VERIFYING -> COMPLETED path', () => {
    expect(isValidExecutionTransition('EXECUTING', 'VERIFYING')).toBe(true);
    expect(isValidExecutionTransition('VERIFYING', 'COMPLETED')).toBe(true);
    expect(isValidExecutionTransition('EXECUTING', 'COMPLETED')).toBe(true);
    expect(isValidExecutionTransition('VERIFYING', 'EXECUTING')).toBe(false);
    expect(isValidExecutionTransition('COMPLETED', 'VERIFYING')).toBe(false);
  });

  it('rejects identity transitions and unknown edges', () => {
    expect(isValidExecutionTransition('WORKING', 'WORKING')).toBe(false);
    expect(isValidExecutionTransition('COMPLETED', 'FAILED')).toBe(false);
    expect(isValidExecutionTransition('IDLE', 'COMPLETED')).toBe(false);
    expect(isValidExecutionTransition('NEEDS_APPROVAL', 'VERIFYING')).toBe(false);
  });

  it('allows recovery edges from BLOCKED', () => {
    expect(isValidExecutionTransition('BLOCKED', 'UNDERSTANDING')).toBe(true);
    expect(isValidExecutionTransition('BLOCKED', 'PLANNING')).toBe(true);
    expect(isValidExecutionTransition('BLOCKED', 'WORKING')).toBe(true);
  });

  it('marks terminal states as non-recoverable', () => {
    for (const s of EXECUTION_STATE_TERMINAL) {
      expect(isValidExecutionTransition(s, 'WORKING')).toBe(false);
    }
    expect(EXECUTION_STATE_TERMINAL.has('COMPLETED')).toBe(true);
    expect(EXECUTION_STATE_TERMINAL.has('VERIFYING')).toBe(false);
    expect(EXECUTION_STATE_TERMINAL.has('EXECUTING')).toBe(false);
  });

  it('classifies permission tiers so external/sensitive actions require approval', () => {
    expect(permissionTierRequiresApproval('EXTERNAL_ACTION')).toBe(true);
    expect(permissionTierRequiresApproval('SENSITIVE_ACTION')).toBe(true);
    expect(permissionTierRequiresApproval('READ')).toBe(false);
    expect(permissionTierRequiresApproval('GENERATE')).toBe(false);
    expect(permissionTierRequiresApproval('PREPARE')).toBe(false);
    expect(classifyOperationalTaskTier('relationship_follow_up')).toBe('EXTERNAL_ACTION');
    expect(classifyOperationalTaskTier('memory_retrieval')).toBe('READ');
  });
});
