/**
 * Shared responsive shell column (extension tab, `mobile.html`, Capacitor WebView).
 *
 * - **All shapes:** use nearly full width early — phones stay `100%`; tablets/laptops get a wide
 *   editorial column (~52–72rem) instead of a skinny phone gutter below `sm`.
 * - **Large / ultrawide:** ramps toward full viewport, then `max-w-none` past ~2560px.
 *
 * Pair {@link MOBILE_SHELL_EDGE_PAD_CLASS} on chrome rows so full-bleed modes keep breathable gutters.
 * Pair **`mx-auto`** on the same nodes so the capped column centers when narrower than the viewport.
 */
export const MOBILE_SHELL_MAX_WIDTH_CLASS =
  'w-full max-w-[min(100%,52rem)] min-[480px]:max-w-[min(100%,60rem)] sm:max-w-[min(100%,72rem)] md:max-w-6xl lg:max-w-7xl xl:max-w-[min(100%,90rem)] 2xl:max-w-[min(100%,96rem)] min-[1600px]:max-w-[min(100%,108rem)] min-[1920px]:max-w-[min(100%,120rem)] min-[2560px]:max-w-none';

/** Matches shell chrome horizontal inset — scales up when viewport goes ultrawide. */
export const MOBILE_SHELL_EDGE_PAD_CLASS =
  'px-[max(1.125rem,env(safe-area-inset-left,0px))] pe-[max(1.125rem,env(safe-area-inset-right,0px))] sm:px-6 xl:px-8 2xl:px-11 min-[1920px]:px-14 min-[2560px]:px-[clamp(1.75rem,3vw,4rem)]';
