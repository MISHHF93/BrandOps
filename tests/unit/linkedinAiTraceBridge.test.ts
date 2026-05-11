import { describe, expect, it } from 'vitest';
import {
  LINKEDIN_AI_TRACE_SURFACE,
  nextLinkedInAiTraceId
} from '../../src/services/ai/linkedinAiTraceBridge';

describe('linkedinAiTraceBridge', () => {
  it('exposes overlay surface constant and stable trace id prefix', () => {
    expect(LINKEDIN_AI_TRACE_SURFACE).toBe('linkedin_overlay');
    expect(nextLinkedInAiTraceId()).toMatch(/^li-/);
  });
});
