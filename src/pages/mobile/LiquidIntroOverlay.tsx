import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { BrandOpsCrownMark } from '../../shared/ui/brandopsPolish';

/** Once per browser tab session — liquid intro does not repeat until a new session. */
export const LIQUID_INTRO_SESSION_KEY = 'brandops:liquidIntroSession:v1';

const HOLD_MS = 2000;
const FADE_OUT_MS = 520;

export interface LiquidIntroOverlayProps {
  open: boolean;
  btnFocus: string;
  /** Called after exit animation; persist session flag here or in parent. */
  onFinished: () => void;
}

/**
 * Full-screen “liquid” morphing blobs with light 3D tilt — CSS only (no Three/WebGL).
 * Skipped when {@link LIQUID_INTRO_SESSION_KEY} is set or when reduced motion is preferred.
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
      aria-labelledby="bo-liquid-intro-title"
      className={clsx(
        'bo-liquid-intro-root fixed inset-0 z-[120] flex flex-col items-center justify-center overflow-hidden',
        phase === 'exit' && 'bo-liquid-intro-root--exit'
      )}
    >
      <h2 id="bo-liquid-intro-title" className="sr-only">
        Welcome to BrandOps
      </h2>

      <div className="bo-liquid-intro-backdrop" aria-hidden />

      <div className="bo-liquid-intro-stage pointer-events-none" aria-hidden>
        <div className="bo-liquid-intro-blob bo-liquid-intro-blob--a" />
        <div className="bo-liquid-intro-blob bo-liquid-intro-blob--b" />
        <div className="bo-liquid-intro-blob bo-liquid-intro-blob--c" />
        <div className="bo-liquid-intro-shine" />
      </div>

      <div className="relative z-[2] flex flex-col items-center px-6 text-center bo-liquid-intro-lockup">
        <span className="bo-mobile-brand__mark bo-mobile-brand__mark--compact bo-liquid-intro-lockup-mark mb-3 inline-flex rounded-2xl p-3">
          <BrandOpsCrownMark className="h-10 w-10 sm:h-11 sm:w-11" />
        </span>
        <p className="text-sm font-semibold tracking-wide text-text">BrandOps</p>
        <p className="bo-liquid-intro-lockup-sub mt-1 max-w-[16rem] text-[11px] leading-snug">
          Liquid workspace shell — morphing in.
        </p>
      </div>

      <button
        ref={skipRef}
        type="button"
        onClick={finishNow}
        className={clsx(
          'absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-[3] -translate-x-1/2 rounded-full border border-border/55 bg-surface/85 px-4 py-2 text-[11px] font-semibold text-textMuted shadow-panel backdrop-blur-sm motion-safe:transition-colors motion-safe:duration-fast hover:border-borderStrong hover:bg-surfaceActive hover:text-text',
          btnFocus
        )}
      >
        Skip intro
      </button>
    </div>
  );
}
