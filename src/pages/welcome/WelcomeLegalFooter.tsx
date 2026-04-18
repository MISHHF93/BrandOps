import { SurfaceNavLinks } from '../../shared/navigation/SurfaceNavLinks';

export interface WelcomeLegalFooterProps {
  manifestVersion: string;
}

export function WelcomeLegalFooter({ manifestVersion }: WelcomeLegalFooterProps) {
  return (
    <footer className="space-y-2.5 pt-3 text-center text-xs text-textSoft">
      <SurfaceNavLinks />
      <p className="text-[11px] text-textSoft">
        BrandOps{manifestVersion ? ` · v${manifestVersion}` : ''}
      </p>
    </footer>
  );
}
