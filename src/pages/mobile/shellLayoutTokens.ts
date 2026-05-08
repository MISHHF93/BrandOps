/**
 * Shared responsive shell column (extension tab, `mobile.html`, Capacitor WebView).
 *
 * - Phones/tablets: capped reading width.
 * - Laptop/desktop: progressively wider (`xl` / `2xl`).
 * - Large desktop / ultrawide (e.g. 34" 3440px): raises caps toward full viewport, then `max-w-none`
 *   past ~2560px so layout isn’t a skinny pillar with unused lateral space.
 *
 * Pair {@link MOBILE_SHELL_EDGE_PAD_CLASS} on chrome rows so full-bleed modes keep breathable gutters.
 */
export const MOBILE_SHELL_MAX_WIDTH_CLASS =
  'w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-5xl xl:max-w-7xl 2xl:max-w-[90rem] min-[1600px]:max-w-[104rem] min-[1920px]:max-w-[min(100%,120rem)] min-[2560px]:max-w-none';

/** Matches shell chrome horizontal inset — scales up when viewport goes ultrawide. */
export const MOBILE_SHELL_EDGE_PAD_CLASS =
  'px-[max(1rem,env(safe-area-inset-left,0px))] pe-[max(1rem,env(safe-area-inset-right,0px))] xl:px-8 2xl:px-11 min-[1920px]:px-14 min-[2560px]:px-[clamp(1.75rem,3vw,4rem)]';
