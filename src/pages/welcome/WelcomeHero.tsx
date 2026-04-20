import { motion, useReducedMotion } from 'motion/react';
import { welcomeCrownSrc } from './welcomeUtils';
import type { WelcomeAuthMode } from './welcomeUtils';

interface WelcomeHeroProps {
  signedIn: boolean;
  authMode: WelcomeAuthMode;
}

const ease = [0.22, 1, 0.36, 1] as const;

export function WelcomeHero({ signedIn, authMode }: WelcomeHeroProps) {
  const reduce = useReducedMotion();

  const title = signedIn
    ? "You're signed in"
    : authMode === 'signUp'
      ? 'Create your BrandOps account'
      : 'Sign in to BrandOps';

  const subtitle = signedIn
    ? 'Continue to your workspace. Manage or disconnect accounts in Settings anytime.'
    : 'Use Google, GitHub, or LinkedIn. Your workspace stays on this device unless you export it.';

  const baseDelay = reduce ? 0 : 0.05;

  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduce ? 0 : 0.55, ease }}
        className="relative mb-4"
      >
        <div
          className="absolute inset-0 -m-6 rounded-full opacity-40 blur-2xl"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgb(var(--color-primary) / 0.25), transparent 68%)'
          }}
          aria-hidden
        />
        <img
          src={welcomeCrownSrc()}
          alt="BrandOps"
          width={48}
          height={48}
          className="relative h-12 w-12 drop-shadow-md"
        />
      </motion.div>

      <motion.p
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.45, delay: baseDelay, ease }}
        className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-textSoft"
      >
        Brand operating system
      </motion.p>

      <motion.h1
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.55, delay: baseDelay + 0.06, ease }}
        className="max-w-[22rem] text-balance text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-text sm:text-[2rem]"
      >
        {title}
      </motion.h1>

      <motion.p
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.5, delay: baseDelay + 0.12, ease }}
        className="mt-3 max-w-sm text-sm leading-relaxed text-textSoft"
      >
        {subtitle}
      </motion.p>
    </div>
  );
}
