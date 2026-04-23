# Cross-Surface Launch Checklist

Use this checklist before submitting BrandOps to the App Store and Chrome Web Store.

## Identity and Membership UX

- [ ] Auth gate appears for signed-out users in both extension and mobile surfaces.
- [ ] Providers are visible: Google, Apple, Email magic link.
- [ ] Membership gate appears for signed-in users without an active membership.
- [ ] Stripe checkout link opens from Settings and gate surface.
- [ ] Billing portal link opens from Settings.

## Required Environment

- [ ] `VITE_STRIPE_CHECKOUT_URL` set to production Stripe checkout URL.
- [ ] `VITE_STRIPE_BILLING_PORTAL_URL` set to production Stripe billing portal URL.
- [ ] OAuth callback URLs and IdP app credentials match store bundle IDs and extension ID.

## Cross-Surface Parity

- [ ] `mobile.html` and extension/options surfaces render the same auth and membership states.
- [ ] Settings shows account + membership section on all surfaces.
- [ ] Chat and Today navigation remains unchanged after auth/membership gates.

## iOS Readiness

- [ ] Run on macOS: `npm run build:mobile && npm run ios:add`.
- [ ] Run `npm run ios:sync` and open project with `npm run ios:open`.
- [ ] Verify auth gate, membership gate, chat composer, and settings billing links on iPhone simulator/device.

## Verification Gates

- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] Store listing copy, privacy policy, and in-app behavior are consistent.
