export interface WelcomeLegalFooterProps {
  manifestVersion: string;
}

export function WelcomeLegalFooter({ manifestVersion }: WelcomeLegalFooterProps) {
  return (
    <footer className="pt-3 text-center text-xs text-textSoft">
      <p className="text-[11px] text-textSoft">
        BrandOps{manifestVersion ? ` · v${manifestVersion}` : ''}
      </p>
    </footer>
  );
}
