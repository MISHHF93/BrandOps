import { buildWelcomeSignInUrl } from '../../../shared/navigation/extensionLinks';
import { resolveExtensionUrl } from '../../../shared/navigation/extensionRuntime';

/** Shown when the workspace has no federated session (see `canAccessApp`). */

const welcomeHref = () => resolveExtensionUrl(buildWelcomeSignInUrl());

export function DashboardAuthGate() {
  return (
    <main className="bo-system-screen bo-dashboard-shell min-h-0 min-w-0 p-4">
      <section className="bo-card max-w-lg space-y-3" role="region" aria-labelledby="bo-auth-gate-title">
        <h2 id="bo-auth-gate-title" className="text-base font-semibold text-text">
          Sign in to use the cockpit
        </h2>
        <p className="text-sm text-textMuted">
          BrandOps requires third-party sign-in (Google, GitHub, or LinkedIn). Open Welcome to sign in — your workspace
          stays in this browser unless you export it.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <a className="bo-link" href={welcomeHref()}>
            Open Welcome — sign in
          </a>
        </div>
      </section>
    </main>
  );
}
