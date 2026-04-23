/** Browser OAuth popup + postMessage (no chrome.identity). Callback pages live under /oauth/*.html */

const MESSAGE_TYPE = 'brandops-oauth-redirect';

export function getWebOAuthRedirectUrl(pathSuffix: string): string | null {
  if (typeof window === 'undefined') return null;
  return `${window.location.origin}/oauth/${pathSuffix}.html`;
}

/**
 * Opens provider auth in a popup; the static callback page posts the final redirect URL back.
 * Resolves with the full callback URL (including ?code=…), or null if the user closed the window early.
 */
export function launchBrowserOAuthWebAuthFlow(
  authUrl: string,
  redirectUri: string
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const origin = window.location.origin;
    let settled = false;
    let poll: ReturnType<typeof setInterval> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const expected = new URL(redirectUri);

    const opened = window.open(authUrl, 'brandops_oauth', 'width=520,height=720,scrollbars=yes');
    if (!opened) {
      reject(new Error('Popup was blocked. Allow popups for this site to sign in.'));
      return;
    }
    const oauthPopup: Window = opened;

    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      if (poll !== undefined) clearInterval(poll);
      if (timeout !== undefined) clearTimeout(timeout);
      resolve(value);
    };

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      if (poll !== undefined) clearInterval(poll);
      if (timeout !== undefined) clearTimeout(timeout);
      reject(err);
    };

    function onMessage(event: MessageEvent) {
      if (event.origin !== origin) return;
      const data = event.data as { type?: string; url?: string } | null;
      if (!data || data.type !== MESSAGE_TYPE || typeof data.url !== 'string') return;

      let got: URL;
      try {
        got = new URL(data.url);
      } catch {
        return;
      }
      if (got.origin !== origin || got.pathname !== expected.pathname) return;

      try {
        oauthPopup.close();
      } catch {
        // ignore
      }
      finish(data.url);
    }

    window.addEventListener('message', onMessage);

    poll = setInterval(() => {
      if (oauthPopup.closed) {
        finish(null);
      }
    }, 350);

    timeout = setTimeout(() => {
      try {
        if (!oauthPopup.closed) oauthPopup.close();
      } catch {
        // ignore
      }
      fail(new Error('OAuth timed out. Close any open sign-in windows and try again.'));
    }, 300_000);
  });
}
