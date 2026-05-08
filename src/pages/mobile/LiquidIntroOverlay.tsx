import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { BrandOpsCrownMark } from '../../shared/ui/brandopsPolish';

/** Bump when the intro visuals change materially — shows the new sequence once per tab session. */
export const LIQUID_INTRO_SESSION_KEY = 'brandops:intro3d:v4';

const HOLD_MS = 3800;
const FADE_OUT_MS = 580;

export interface LiquidIntroOverlayProps {
  open: boolean;
  btnFocus: string;
  onFinished: () => void;
}

/**
 * Full-screen welcome scene: static perspective grid + monolith over a slow green / black / brown gradient.
 * No WebGL; respects reduced motion via stylesheet + parent skip logic.
 */
export function LiquidIntroOverlay({ open, btnFocus, onFinished }: LiquidIntroOverlayProps) {
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter');
  const skipRef = useRef<HTMLButtonElement>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    finishedRef.current = false;
    setPhase('enter');
    const hold = window.setTimeout(() => setPhase('exit'), HOLD_MS);
    return () => window.clearTimeout(hold);
  }, [open]);

  useEffect(() => {
    if (!open || phase !== 'exit') return;
    const t = window.setTimeout(() => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onFinished();
    }, FADE_OUT_MS);
    return () => window.clearTimeout(t);
  }, [open, phase, onFinished]);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => skipRef.current?.focus());
  }, [open]);

  if (!open) return null;

  const finishNow = () => {
    setPhase('exit');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bo-intro3d-title"
      className={clsx(
        'bo-intro3d-root fixed inset-0 z-[120] flex flex-col items-center justify-center overflow-hidden',
        phase === 'exit' && 'bo-intro3d-root--exit'
      )}
    >
      <h2 id="bo-intro3d-title" className="sr-only">
        Welcome to BrandOps
      </h2>

      <div className="bo-intro3d-ambient" aria-hidden />
      <div className="bo-intro3d-vignette" aria-hidden />

      <div className="bo-intro3d-scene" aria-hidden>
        <div className="bo-intro3d-world">
          <div className="bo-intro3d-floor" />
          <div className="bo-intro3d-monolith-wrap">
            <div className="bo-intro3d-monolith" />
          </div>
        </div>
      </div>

      <div className="relative z-[4] flex flex-col items-center px-6 text-center bo-intro3d-lockup">
        <span className="bo-mobile-brand__mark bo-mobile-brand__mark--compact bo-intro3d-lockup-mark mb-3 inline-flex rounded-2xl p-3">
          <BrandOpsCrownMark className="h-10 w-10 sm:h-11 sm:w-11" />
        </span>
        <p className="text-sm font-semibold tracking-wide text-text">BrandOps</p>
        <p className="bo-intro3d-lockup-sub mt-1 max-w-[16rem] text-[11px] leading-snug">
          Workspace boot — depth-calibrated shell.
        </p>
      </div>

      <button
        ref={skipRef}
        type="button"
        onClick={finishNow}
        className={clsx(
          'absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-[5] -translate-x-1/2 rounded-full border border-border/55 bg-surface/85 px-4 py-2 text-[11px] font-semibold text-textMuted shadow-panel backdrop-blur-sm motion-safe:transition-colors motion-safe:duration-fast hover:border-borderStrong hover:bg-surfaceActive hover:text-text',
          btnFocus
        )}
      >
        Skip intro
      </button>
    </div>
  );
}
