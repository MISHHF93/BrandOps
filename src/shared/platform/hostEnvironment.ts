import { Capacitor } from '@capacitor/core';

/**
 * Where the BrandOps UI bundle is running. Used to branch navigation and user-facing hints.
 * Extension background shares `chrome.runtime.id`; Capacitor shell has no extension APIs.
 */
export type BrandOpsHostKind = 'chrome-extension' | 'capacitor-android' | 'capacitor-ios' | 'web';

let cached: BrandOpsHostKind | undefined;

/**
 * Detect host once per JS realm (pages + extension service worker).
 * Order: extension id wins over Capacitor so MV3 pages never mis-classify as native.
 */
export function getBrandOpsHostKind(): BrandOpsHostKind {
  if (cached !== undefined) {
    return cached;
  }

  const extensionLike =
    typeof chrome !== 'undefined' && chrome.runtime != null && chrome.runtime.id != null;

  if (extensionLike) {
    cached = 'chrome-extension';
    return cached;
  }

  try {
    if (Capacitor.isNativePlatform()) {
      const platform = Capacitor.getPlatform();
      if (platform === 'android') {
        cached = 'capacitor-android';
        return cached;
      }
      if (platform === 'ios') {
        cached = 'capacitor-ios';
        return cached;
      }
    }
  } catch {
    /* Capacitor unavailable (e.g. some test runners) */
  }

  cached = 'web';
  return cached;
}
