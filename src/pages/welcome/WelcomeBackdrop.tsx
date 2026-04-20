import { motion, useReducedMotion } from 'motion/react';

/**
 * Full-viewport ambient layer: soft aurora meshes + grid + drifting orbs.
 * Keeps BrandOps monochrome identity; motion respects reduced-motion.
 */
export function WelcomeBackdrop() {
  const reduce = useReducedMotion();

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div
        className="absolute inset-0 bg-bg"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 120% 80% at 50% -20%, rgb(var(--color-primary) / 0.12), transparent 55%),
            radial-gradient(ellipse 90% 60% at 100% 0%, rgb(var(--color-glow) / 0.08), transparent 50%),
            radial-gradient(ellipse 70% 50% at 0% 100%, rgb(var(--color-secondary) / 0.06), transparent 45%)
          `
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.22]"
        style={{
          backgroundImage: `
            linear-gradient(rgb(var(--color-border) / 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgb(var(--color-border) / 0.06) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, black 20%, transparent 75%)'
        }}
      />
      {!reduce ? (
        <>
          <motion.div
            className="absolute -left-[20%] top-[15%] h-[min(520px,55vh)] w-[min(520px,70vw)] rounded-full blur-3xl"
            style={{
              background:
                'radial-gradient(circle at 30% 30%, rgb(var(--color-primary) / 0.18), transparent 65%)'
            }}
            animate={{ x: [0, 24, -12, 0], y: [0, -18, 10, 0], opacity: [0.55, 0.75, 0.6, 0.55] }}
            transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -right-[15%] bottom-[10%] h-[min(480px,50vh)] w-[min(480px,65vw)] rounded-full blur-3xl"
            style={{
              background:
                'radial-gradient(circle at 70% 60%, rgb(var(--color-glow) / 0.14), transparent 62%)'
            }}
            animate={{ x: [0, -20, 14, 0], y: [0, 22, -8, 0], opacity: [0.4, 0.62, 0.48, 0.4] }}
            transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
          />
          <motion.div
            className="absolute left-[35%] top-[55%] h-[200px] w-[200px] rounded-full blur-2xl"
            style={{
              background: 'radial-gradient(circle, rgb(var(--color-border-strong) / 0.2), transparent 70%)'
            }}
            animate={{ scale: [1, 1.08, 0.98, 1], opacity: [0.25, 0.4, 0.3, 0.25] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      ) : null}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay dark:opacity-[0.07]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }}
      />
    </div>
  );
}
