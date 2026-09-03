/**
 * Making BrandOps installable on a device.
 *
 * The manifest at `/site.webmanifest` was complete — start_url, standalone
 * display, 192/512 icons including a maskable one — and **no page linked it**.
 * A browser that never sees a manifest never offers an install, so the honest
 * answer to "how do I install this?" was that you could not. There was no
 * service worker either, which Chrome also requires.
 *
 * This module registers the worker and exposes the install prompt as ordinary
 * state, so a surface can offer installation at a sensible moment rather than
 * the browser deciding on its own.
 *
 * Registration is deliberately narrow:
 *
 * - **Never in an extension.** A Chrome extension page has its own lifecycle and
 *   a service worker there would collide with the MV3 background worker.
 * - **Never in a Capacitor shell.** The native app is already installed; a
 *   worker would add a second cache layer under the WebView for no benefit.
 * - **Never in development.** A stale worker serving yesterday's bundle while
 *   you edit is a debugging trap that costs more than it saves.
 */
import { getBrandOpsHostKind } from './hostEnvironment';

/** The `beforeinstallprompt` event, which TypeScript's DOM lib does not model. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: InstallPromptEvent | null = null;

/** Whether a service worker should run in this host at all. */
export function shouldRegisterServiceWorker(
  host: ReturnType<typeof getBrandOpsHostKind>,
  isDev: boolean
): boolean {
  if (isDev) return false;
  return host === 'web';
}

/** True when the app is already running as an installed app. */
export function isRunningInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches;
  // iOS Safari reports this instead of the media query.
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return Boolean(standalone || iosStandalone);
}

/** Whether an install can be offered right now. */
export function canOfferInstall(): boolean {
  return deferredPrompt !== null && !isRunningInstalled();
}

/**
 * Show the browser's install prompt.
 *
 * Returns what the person chose, so a caller can stop offering rather than
 * asking again — repeatedly prompting is the notification abuse the directive
 * rules out.
 */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const prompt = deferredPrompt;
  if (!prompt) return 'unavailable';
  deferredPrompt = null;
  try {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    return outcome;
  } catch {
    return 'unavailable';
  }
}

/**
 * Register the worker and start listening for the install opportunity.
 *
 * Safe to call more than once and safe to call anywhere: every unsupported host
 * returns without touching the page.
 */
export function initInstallability(
  options: { isDev?: boolean; onAvailable?: () => void } = {}
): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (event) => {
    // Chrome fires this instead of prompting; keeping it is what lets the
    // product choose the moment.
    event.preventDefault();
    deferredPrompt = event as InstallPromptEvent;
    options.onAvailable?.();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
  });

  const isDev = options.isDev ?? false;
  if (!shouldRegisterServiceWorker(getBrandOpsHostKind(), isDev)) return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    // Failure here must never break the app: an uninstallable BrandOps is a
    // lesser problem than one that will not start.
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
