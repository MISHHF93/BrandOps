import { describe, expect, it } from 'vitest';
import { BridgeReplayGuard } from '../../src/services/agent/bridgeReplayGuard';

describe('BridgeReplayGuard', () => {
  it('rejects duplicate nonce inside ttl window', () => {
    const guard = new BridgeReplayGuard(10_000);
    const now = 1_000_000;
    const first = guard.registerAndCheckReplay('nonce-1', now);
    const second = guard.registerAndCheckReplay('nonce-1', now + 2_000);
    expect(first).toBe(false);
    expect(second).toBe(true);
  });

  it('allows nonce reuse after ttl expires', () => {
    const guard = new BridgeReplayGuard(5_000);
    const now = 1_000_000;
    guard.registerAndCheckReplay('nonce-2', now);
    const afterTtl = guard.registerAndCheckReplay('nonce-2', now + 6_000);
    expect(afterTtl).toBe(false);
  });
});
