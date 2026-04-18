import { SurfaceNavLinks } from './SurfaceNavLinks';

/**
 * Knowledge Center (and other work surfaces): full extension directory with Sign up before Sign in.
 */
export function ExtensionPagesFooter() {
  return (
    <nav
      className="border-t border-border/60 pt-4 text-xs text-textSoft"
      aria-label="Extension pages"
    >
      <SurfaceNavLinks className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5" />
    </nav>
  );
}
