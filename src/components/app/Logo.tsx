import logoImg from '@/assets/logo.png';
import { ICON_FILES, useAppBranding } from '@/hooks/useAppBranding';

const MODE_BADGE: Record<string, string | null> = {
  normal: null,
  maintenance: 'Manutenção',
  event: 'Evento',
  founders: 'Founders',
};

export const Logo = ({ size = 'default' }: { size?: 'default' | 'small' }) => {
  const { mode } = useAppBranding();
  const imgClass = size === 'small' ? 'h-6 w-auto' : 'h-8 w-auto';
  const src = mode === 'normal' ? logoImg : ICON_FILES[mode];
  const badge = MODE_BADGE[mode];

  return (
    <div className="flex items-center gap-2">
      <img src={src} alt="Logo FinZap" className={`${imgClass} rounded`} />
      <span style={{ fontFamily: "'Manrope', sans-serif" }} className="text-base sm:text-lg">
        <span className="font-medium">Fin</span>
        <span className="font-bold text-primary">Zap</span>
      </span>
      {badge && (
        <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">
          {badge}
        </span>
      )}
    </div>
  );
};
