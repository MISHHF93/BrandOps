import { useEffect, useRef, useState } from 'react';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';
import { InlineAlert } from '../../shared/ui/components';
import {
  canUseVercelPreviewSignIn,
  isPreviewDeploymentSignInEnabled,
  isPreviewMagicConfigured,
  isPreviewOpenSignInEnabled
} from '../../shared/config/previewDeployment';

const PREVIEW_QUERY = 'preview_magic';

export interface WelcomeVercelPreviewAuthProps {
  /** Workspace loaded from storage — required before preview sign-in runs. */
  storageReady: boolean;
  onPreviewSucceeded: () => void;
}

export function WelcomeVercelPreviewAuth({ storageReady, onPreviewSucceeded }: WelcomeVercelPreviewAuthProps) {
  const loading = useBrandOpsStore((s) => s.loading);
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const magicLinkAttempted = useRef(false);

  const enabled = isPreviewDeploymentSignInEnabled();
  const workable = canUseVercelPreviewSignIn();
  const openPreview = isPreviewOpenSignInEnabled();
  const magicConfigured = isPreviewMagicConfigured();

  useEffect(() => {
    if (!enabled || !workable || !storageReady || magicLinkAttempted.current) return;
    const params = new URLSearchParams(window.location.search);
    const magic = params.get(PREVIEW_QUERY)?.trim();
    if (!magic) return;
    magicLinkAttempted.current = true;
    let cancelled = false;
    void (async () => {
      try {
        await useBrandOpsStore.getState().signInWithVercelPreview({ magicToken: magic });
        if (cancelled) return;
        onPreviewSucceeded();
        params.delete(PREVIEW_QUERY);
        const q = params.toString();
        const next = `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`;
        window.history.replaceState(null, '', next);
      } catch (e) {
        if (!cancelled) {
          magicLinkAttempted.current = false;
          setError(e instanceof Error ? e.message : 'Preview sign-in failed.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, workable, storageReady, onPreviewSucceeded]);

  const runPreview = async (options?: { magicToken?: string }) => {
    setError(null);
    await useBrandOpsStore.getState().signInWithVercelPreview(options);
    onPreviewSucceeded();
  };

  if (!enabled) return null;

  if (!workable) {
    return (
      <div className="mt-6">
        <InlineAlert
          tone="warning"
          title="Preview sign-in not configured"
          message="Set VITE_VERCEL_PREVIEW_SIGNIN=1 and either VITE_PREVIEW_MAGIC_TOKEN (8+ characters) or VITE_PREVIEW_OPEN_SIGNIN=1 in Vercel environment variables, then redeploy."
          className="rounded-lg border-border bg-surface/35 text-text"
        />
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3 rounded-xl border border-primary/25 bg-primarySoft/10 p-4">
      <h3 className="text-sm font-semibold text-text">Hosted preview (Vercel)</h3>
      <p className="text-xs text-textMuted">
        OAuth client IDs are optional for this deploy. Use a shared secret: add{' '}
        <code className="rounded bg-bg/60 px-1">?preview_magic=…</code> to this page URL, or verify the token
        below.
      </p>
      {openPreview ? (
        <InlineAlert
          tone="warning"
          title="Open preview is enabled"
          message="Anyone on this URL can sign in without a token. Use only for private or time-boxed demos."
          className="rounded-lg border-warning/40 bg-warningSoft/15 text-text"
        />
      ) : null}
      {error ? (
        <InlineAlert tone="danger" title="Preview sign-in failed" message={error} className="rounded-lg" />
      ) : null}
      {openPreview ? (
        <button
          type="button"
          className="w-full rounded-xl border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
          disabled={loading}
          onClick={() => void runPreview().catch((e) => setError(e instanceof Error ? e.message : 'Failed'))}
        >
          {loading ? 'Signing in…' : 'Continue with preview access'}
        </button>
      ) : null}
      {magicConfigured ? (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-textSoft">
            Preview token (matches Vercel <code className="rounded bg-bg/60 px-0.5">VITE_PREVIEW_MAGIC_TOKEN</code>)
            <input
              type="password"
              autoComplete="off"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-bg/80 px-3 py-2 text-sm text-text"
              placeholder="Paste the shared token"
            />
          </label>
          <button
            type="button"
            className="w-full rounded-xl border border-border bg-bgElevated px-4 py-2 text-sm font-medium text-text hover:bg-bg/80 disabled:opacity-50"
            disabled={loading}
            onClick={() =>
              void runPreview({ magicToken: tokenInput }).catch((e) =>
                setError(e instanceof Error ? e.message : 'Failed')
              )
            }
          >
            {loading ? 'Verifying…' : 'Verify token and continue'}
          </button>
        </div>
      ) : !openPreview ? (
        <p className="text-xs text-textSoft">Add VITE_PREVIEW_MAGIC_TOKEN in Vercel (8+ characters) to enable token entry.</p>
      ) : null}
    </div>
  );
}
