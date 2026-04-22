import { BridgeReplayGuard } from './bridgeReplayGuard';

const STORAGE_KEY = 'brandops:bridgeNonceExpiry';
const inMemory = new BridgeReplayGuard();

const hasChromeStorage = () =>
  typeof chrome !== 'undefined' &&
  Boolean(chrome.storage?.local?.get) &&
  Boolean(chrome.storage?.local?.set);

/**
 * Durable(ish) replay protection for the extension: persists nonce expiry map in
 * `chrome.storage.local` when available; otherwise falls back to the in-memory guard
 * (dev builds and unit tests).
 */
export const isBridgeNonceReplayed = async (nonce: string, ttlMs = 10 * 60 * 1000, now = Date.now()) => {
  const normalized = nonce.trim();
  if (!normalized) return true;
  if (!hasChromeStorage()) {
    return inMemory.registerAndCheckReplay(normalized, now);
  }
  return new Promise<boolean>((resolve, reject) => {
    void chrome.storage.local.get(STORAGE_KEY, (existing) => {
      const lastError = chrome.runtime?.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      const raw = (existing as { [k: string]: unknown })[STORAGE_KEY] as
        | Record<string, number>
        | undefined;
      const map: Record<string, number> = raw && typeof raw === 'object' ? { ...raw } : {};
      for (const [k, exp] of Object.entries(map)) {
        if (typeof exp !== 'number' || exp <= now) {
          delete map[k];
        }
      }
      const previous = map[normalized];
      if (typeof previous === 'number' && previous > now) {
        void chrome.storage.local.set({ [STORAGE_KEY]: map });
        resolve(true);
        return;
      }
      map[normalized] = now + ttlMs;
      void chrome.storage.local.set({ [STORAGE_KEY]: map }, () => {
        const e = chrome.runtime?.lastError;
        if (e) {
          reject(new Error(e.message));
        } else {
          resolve(false);
        }
      });
    });
  });
};
