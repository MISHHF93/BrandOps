import { useEffect, useState } from 'react';
import clsx from 'clsx';
import {
  PRO_VALUE_POINTS,
  paywallModelFromOffering,
  type PaywallModel
} from '../../services/monetization/paywallModel';
import { loadOfferings, purchasePackage } from '../../services/monetization/purchasesRuntime';
import {
  canPurchase,
  describeEntitlement,
  type EntitlementState
} from '../../services/monetization/entitlements';

/**
 * The paywall.
 *
 * Value before price, which is why `PRO_VALUE_POINTS` renders above the
 * packages rather than beside them: a price shown before a reason is a number
 * with nothing to weigh it against.
 *
 * Three things it deliberately will not do:
 *
 * - **Offer a purchase that cannot complete.** On the web build there is no
 *   native bridge and on an unconfigured build there is no RevenueCat, so it
 *   says which rather than rendering a button that dead-ends.
 * - **Claim success from a returning call.** `purchasePackage` re-reads the
 *   entitlement and this component reports whatever came back. A purchase can
 *   succeed at the store and still not confer the entitlement — deferred
 *   family approval, a pending payment, the wrong product — and treating "the
 *   call returned" as "they are Pro" is how a paywall grants what it should not.
 * - **Apologise for a cancellation.** A person changing their mind is a normal
 *   outcome, not an error to dress up.
 */
export function PaywallSheet({
  entitlement,
  btnFocus,
  onClose,
  onEntitlementChanged,
  onRestore
}: {
  entitlement: EntitlementState;
  btnFocus: string;
  onClose: () => void;
  onEntitlementChanged: (next: EntitlementState) => void;
  onRestore: () => void | Promise<void>;
}) {
  const [model, setModel] = useState<PaywallModel | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadOfferings().then((offering) => {
      if (cancelled) return;
      setModel(paywallModelFromOffering(offering));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const purchasable = canPurchase(entitlement);

  async function buy(packageId: string, raw: unknown) {
    setBusy(packageId);
    setMessage(null);
    const outcome = await purchasePackage(raw);
    setBusy(null);

    if (outcome.ok) {
      onEntitlementChanged(outcome.state);
      // Reports what the entitlement actually says, not that a call returned.
      setMessage(describeEntitlement(outcome.state));
      return;
    }
    setMessage(outcome.cancelled ? null : outcome.message);
  }

  return (
    <section className="bo-flagship-surface p-4 text-sm text-textMuted" aria-label="BrandOps Pro">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-h2 text-text">BrandOps Pro</h2>
        <button type="button" className={clsx('bo-btn-ghost', btnFocus)} onClick={onClose}>
          Close
        </button>
      </div>

      <ul className="mt-3 space-y-1.5">
        {PRO_VALUE_POINTS.map((point) => (
          <li key={point} className="text-meta leading-snug text-text">
            {point}
          </li>
        ))}
      </ul>

      {!purchasable ? (
        <p className="mt-3 rounded-lg border border-border/40 bg-bgSubtle/55 px-2.5 py-2 text-fine text-textMuted">
          {describeEntitlement(entitlement)}
        </p>
      ) : model === null ? (
        <p className="mt-3 text-fine text-textMuted">Loading plans…</p>
      ) : model.emptyReason ? (
        <p className="mt-3 text-fine text-textMuted">{model.emptyReason}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {model.packages.map((pkg) => (
            <li key={pkg.id}>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void buy(pkg.id, pkg.raw)}
                className={clsx(
                  'flex w-full items-center justify-between rounded-lg border border-border/40 px-3 py-2.5 text-left disabled:opacity-60',
                  btnFocus
                )}
              >
                <span className="min-w-0">
                  <span className="block text-label font-semibold text-text">{pkg.title}</span>
                  {pkg.highlight ? (
                    <span className="block text-fine text-accent">{pkg.highlight}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-label font-semibold text-text">
                  {busy === pkg.id ? 'Working…' : pkg.price}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {message ? <p className="mt-3 text-fine text-textSoft">{message}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={clsx('bo-btn-ghost', btnFocus)}
          onClick={() => void onRestore()}
        >
          Restore purchases
        </button>
      </div>
      <p className="mt-2 text-fine text-textMuted">
        Billed by the App Store or Play Store. Cancel any time in your store account.
      </p>
    </section>
  );
}
