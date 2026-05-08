import { browserLocalStorage } from '../../shared/storage/browserStorage';
import { BridgeReplayGuard } from './bridgeReplayGuard';

const STORAGE_KEY = 'brandops:bridgeNonceExpiry';
const inMemory = new BridgeReplayGuard();

/**
 * Durable(ish) replay protection: persists nonce expiry map via {@link browserLocalStorage}
 * (Chrome `chrome.storage.local`, Capacitor `localStorage`, tests → memory).
 */
export const isBridgeNonceReplayed = async (
  nonce: string,
  ttlMs = 10 * 60 * 1000,
  now = Date.now()
) => {
  const normalized = nonce.trim();
  if (!normalized) return true;

  try {
    const raw = await browserLocalStorage.get<Record<string, number>>(STORAGE_KEY);
    const map: Record<string, number> = raw && typeof raw === 'object' ? { ...raw } : {};
    for (const [k, exp] of Object.entries(map)) {
      if (typeof exp !== 'number' || exp <= now) {
        delete map[k];
      }
    }
    const previous = map[normalized];
    if (typeof previous === 'number' && previous > now) {
      await browserLocalStorage.set(STORAGE_KEY, map);
      return true;
    }
    map[normalized] = now + ttlMs;
    await browserLocalStorage.set(STORAGE_KEY, map);
    return false;
  } catch {
    return inMemory.registerAndCheckReplay(normalized, now);
  }
};
