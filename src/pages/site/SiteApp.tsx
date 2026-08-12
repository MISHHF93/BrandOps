import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Command,
  Layers,
  Linkedin,
  Lock,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';
import { BrandOpsCrownMark } from '../../shared/ui/brandopsPolish';
import { hrefHelpPage, hrefSignIn, hrefSignUp } from '../../shared/navigation/navigationIntents';
import { getPrivacyPolicyHref } from '../../shared/config/privacyPolicyUrl';

/** Marketing site is a standalone document (not the `MobileApp` shell) — its own small focus-ring constant. */
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focusRing/80 focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

const PRIMARY_BTN = clsx(
  'inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-label font-semibold text-bg',
  'transition-colors duration-fast hover:brightness-105 active:brightness-95',
  FOCUS_RING
);

const SECONDARY_BTN = clsx(
  'inline-flex items-center gap-2 rounded-lg border border-border px-5 py-3 text-label font-semibold text-text',
  'transition-colors duration-fast hover:border-borderStrong hover:bg-surface',
  FOCUS_RING
);

interface SiteFeature {
  icon: LucideIcon;
  title: string;
  body: string;
}

const FEATURES: SiteFeature[] = [
  {
    icon: MessageSquare,
    title: 'Assistant and operator commands',
    body: 'Recognized workspace commands run locally; other Assistant requests can use an OpenAI-compatible host you explicitly configure, with citations and trace previews.'
  },
  {
    icon: Layers,
    title: 'Plan, Today, Pulse',
    body: 'One workspace hub: a Plan queue, a Today cockpit, and a read-only Pulse metric strip so you always know where things stand.'
  },
  {
    icon: ShieldCheck,
    title: 'Human-in-the-loop by default',
    body: 'AI-drafted positioning, content, and outreach land in a review queue. You approve or reject — nothing ships on its own.'
  },
  {
    icon: Linkedin,
    title: 'LinkedIn overlay & integrations',
    body: 'Native overlay tooling on LinkedIn plus a dedicated Integrations hub for the accounts your brand work runs through.'
  },
  {
    icon: Lock,
    title: 'Local-first workspace',
    body: 'Your workspace JSON is stored on-device by default. Export or import it anytime; configured hosted-AI features send only selected prompts, context, or embedding content to your approved endpoint.'
  },
  {
    icon: Command,
    title: 'Command palette & review rhythms',
    body: '⌘K to jump anywhere, plus built-in daily, weekly, and monthly reviews for offers, brand, content, and pipeline.'
  }
];

const STEPS: Array<{ step: string; title: string; body: string }> = [
  {
    step: '01',
    title: 'Open the local workspace',
    body: 'Choose an on-device preview identity label. The current build does not contact or authenticate with Google, Apple, GitHub, LinkedIn, or email.'
  },
  {
    step: '02',
    title: 'Ask, audit, draft',
    body: 'Run a positioning audit, generate content angles, or draft outreach — whatever the operator playbook calls for.'
  },
  {
    step: '03',
    title: 'Review and ship',
    body: 'Every AI draft waits in your queue. Approve what’s ready, refine what isn’t. Your call, every time.'
  }
];

const TERMINAL_LINES: Array<{ prompt: boolean; text: string }> = [
  { prompt: true, text: 'audit my positioning' },
  { prompt: false, text: 'Scanning workspace… 3 gaps found in offer clarity.' },
  { prompt: true, text: 'write a linkedin post about shipping AI evals' },
  { prompt: false, text: 'Draft ready — 1 pending approval in your queue.' }
];

export function SiteApp() {
  return (
    <div className="bo-mobile-app bo-site-app relative isolate min-h-[100dvh]">
      <a href="#bo-site-main" className="bo-mobile-skip">
        Skip to main content
      </a>
      <SiteHeader />
      <main id="bo-site-main" tabIndex={-1} className="outline-none">
        <Hero />
        <TrustStrip />
        <Features />
        <HowItWorks />
        <PlatformStrip />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/34 bg-bg/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a href="/" className={clsx('flex min-w-0 items-center gap-2.5', FOCUS_RING)}>
          <span
            className="bo-mobile-brand__mark bo-mobile-brand__mark--compact shrink-0"
            aria-hidden
          >
            <BrandOpsCrownMark className="bo-mobile-brand__logo" />
          </span>
          <span className="bo-mobile-brand__wordmark">BrandOps</span>
        </a>
        <nav className="hidden items-center gap-6 text-meta font-medium text-textMuted md:flex">
          <a className={clsx('transition-colors hover:text-text', FOCUS_RING)} href="#features">
            Features
          </a>
          <a className={clsx('transition-colors hover:text-text', FOCUS_RING)} href="#how-it-works">
            How it works
          </a>
          <a
            className={clsx('transition-colors hover:text-text', FOCUS_RING)}
            href={hrefHelpPage()}
          >
            Help
          </a>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={hrefSignIn()}
            className={clsx(
              'rounded-lg border border-border px-3 py-2 text-label font-medium text-text transition-colors hover:border-borderStrong hover:bg-surface',
              FOCUS_RING
            )}
          >
            Open app
          </a>
          <a
            href={hrefSignUp()}
            className={clsx(
              'rounded-lg bg-accent px-3.5 py-2 text-label font-semibold text-bg transition-colors hover:brightness-105',
              FOCUS_RING
            )}
          >
            New local workspace
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:pb-24 lg:pt-28">
      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="text-overline text-accent">Personal Brand Operating System</p>
          <h1 className="mt-3 text-display text-text sm:text-[2.5rem] sm:leading-[2.9rem] lg:text-[3rem] lg:leading-[3.4rem]">
            Run your personal brand like a system, not a scramble.
          </h1>
          <p className="mt-4 max-w-xl text-body text-textMuted">
            BrandOps is a command-first workspace for technical AI builders: audit your positioning,
            draft content and outreach, and review every AI-generated artifact before it ships.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href={hrefSignUp()} className={PRIMARY_BTN}>
              Open local workspace
              <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </a>
            <a href={hrefSignIn()} className={SECONDARY_BTN}>
              Open existing workspace
            </a>
          </div>
          <p className="mt-4 text-fine text-textSoft">
            No credit card. Workspace storage is local by default; hosted AI is explicit and
            configurable.
          </p>
        </div>
        <TerminalPreview />
      </div>
    </section>
  );
}

function TerminalPreview() {
  return (
    <div className="bo-flagship-surface bo-site-terminal p-4 sm:p-5" aria-hidden>
      <div className="flex items-center gap-1.5 pb-3">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        <span className="ml-2 text-fine text-textSoft">brandops — ask</span>
      </div>
      <div className="space-y-2 text-meta leading-relaxed">
        {TERMINAL_LINES.map((line, i) => (
          <p key={i} className={line.prompt ? 'text-text' : 'text-textMuted'}>
            {line.prompt ? (
              <span className="text-accent">brandops ~ ask: </span>
            ) : (
              <span className="text-textSoft">{'> '}</span>
            )}
            {line.text}
          </p>
        ))}
        <p className="text-text">
          <span className="text-accent">brandops ~ ask: </span>
          <span className="bo-site-cursor" />
        </p>
      </div>
    </div>
  );
}

function TrustStrip() {
  return (
    <section className="border-y border-border/30 bg-surface/25 px-4 py-4 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 text-meta text-textMuted">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-textSoft" strokeWidth={2} aria-hidden />
          Workspace storage is local by default
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-textSoft" strokeWidth={2} aria-hidden />
          Every AI draft needs your approval
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-textSoft" strokeWidth={2} aria-hidden />
          Export or import your workspace anytime
        </span>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto w-full max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-overline text-accent">What you get</p>
          <h2 className="mt-2 text-h1 text-text">One workspace for the operator playbook.</h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="bo-flagship-surface p-5">
              <feature.icon className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
              <h3 className="mt-3 text-h3 text-text">{feature.title}</h3>
              <p className="mt-1.5 text-meta leading-relaxed text-textMuted">{feature.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-t border-border/30 bg-surface/15 px-4 py-16 sm:px-6 lg:py-24"
    >
      <div className="mx-auto w-full max-w-6xl">
        <p className="text-overline text-accent">How it works</p>
        <h2 className="mt-2 text-h1 text-text">Three steps, every time.</h2>
        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          {STEPS.map((item) => (
            <div key={item.step}>
              <span className="text-display text-border">{item.step}</span>
              <h3 className="mt-1 text-h3 text-text">{item.title}</h3>
              <p className="mt-1.5 text-meta leading-relaxed text-textMuted">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlatformStrip() {
  return (
    <section className="px-4 py-14 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 rounded-2xl border border-border/40 bg-bgElevated/60 px-6 py-8 text-center">
        <CalendarClock className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
        <h2 className="text-h2 text-text">Works where you already do the work.</h2>
        <p className="max-w-xl text-meta text-textMuted">
          Install BrandOps as a Chrome extension for the tab you’re already in, or run the same
          workspace as a mobile shell on Android — iOS is on the roadmap.
        </p>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-4 pb-20 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 rounded-2xl border border-accent/30 bg-gradient-to-b from-accent/10 to-transparent px-6 py-12 text-center">
        <h2 className="text-h1 text-text">Ready to run your brand like a system?</h2>
        <p className="max-w-lg text-body text-textMuted">
          Open the app and choose a local preview identity — free to start, local-first by default.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <a href={hrefSignUp()} className={PRIMARY_BTN}>
            Open local workspace
            <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </a>
          <a href={hrefSignIn()} className={SECONDARY_BTN}>
            Open existing workspace
          </a>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  const privacyHref = getPrivacyPolicyHref();
  const privacyHosted = privacyHref.startsWith('https://');

  return (
    <footer className="border-t border-border/30 px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
        <div className="flex items-center gap-2.5">
          <span
            className="bo-mobile-brand__mark bo-mobile-brand__mark--compact shrink-0"
            aria-hidden
          >
            <BrandOpsCrownMark className="bo-mobile-brand__logo" />
          </span>
          <div>
            <p className="bo-mobile-brand__wordmark">BrandOps</p>
            <p className="text-fine text-textSoft">
              Personal brand operating system for technical AI builders.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-meta text-textMuted">
          <a className={clsx('transition-colors hover:text-text', FOCUS_RING)} href={hrefSignIn()}>
            Open app
          </a>
          <a
            className={clsx('transition-colors hover:text-text', FOCUS_RING)}
            href={hrefHelpPage()}
          >
            Help
          </a>
          <a
            className={clsx('transition-colors hover:text-text', FOCUS_RING)}
            href={privacyHref}
            {...(privacyHosted ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
          >
            Privacy
          </a>
        </div>
      </div>
      <p className="mt-6 text-center text-fine text-textSoft sm:text-left">
        © {new Date().getFullYear()} BrandOps.
      </p>
    </footer>
  );
}
