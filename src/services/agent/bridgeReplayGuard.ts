export class BridgeReplayGuard {
  private seen = new Map<string, number>();

  constructor(private readonly ttlMs = 10 * 60 * 1000) {}

  registerAndCheckReplay(nonce: string, now = Date.now()): boolean {
    const normalized = nonce.trim();
    if (!normalized) return true;
    this.prune(now);
    const existing = this.seen.get(normalized);
    if (typeof existing === 'number' && existing > now) {
      return true;
    }
    this.seen.set(normalized, now + this.ttlMs);
    return false;
  }

  private prune(now: number) {
    for (const [key, expiresAt] of this.seen.entries()) {
      if (expiresAt <= now) {
        this.seen.delete(key);
      }
    }
  }
}
