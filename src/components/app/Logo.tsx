import logoImg from '@/assets/logo.png';

export const Logo = ({ size = 'default' }: { size?: 'default' | 'small' }) => {
  const imgClass = size === 'small' ? 'h-6 w-auto' : 'h-8 w-auto';
  
  return (
    <div className="flex items-center gap-2">
      <img src={logoImg} alt="Logo FinZap" className={imgClass} />
      <span style={{ fontFamily: "'Manrope', sans-serif" }} className="text-base sm:text-lg">
        <span className="font-medium">Fin</span>
        <span className="font-bold text-primary">Zap</span>
      </span>
    </div>
  );
};
