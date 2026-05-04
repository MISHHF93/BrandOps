import type { RuntimeMessage } from './messages';

/**
 * When running inside an MV3 extension page, asks the service worker to reload workspace storage
 * and refresh `chrome.alarms` for scheduler reminders. Safe no-op on plain web (no `chrome.runtime`).
 */
export function requestExtensionSchedulerSync(): void {
  if (typeof chrome === 'undefined' || typeof chrome.runtime?.sendMessage !== 'function') {
    return;
  }
  const message: RuntimeMessage = { type: 'SYNC_SCHEDULER' };
  try {
    chrome.runtime.sendMessage(message, () => {
      void chrome.runtime?.lastError;
    });
  } catch {
    /* Extension context invalidated */
  }
}
