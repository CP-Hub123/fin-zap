import { Home, Target, Sparkles, Menu as MenuIcon } from 'lucide-react';
import { LiquidNavbar, type LiquidNavItem } from '@/components/ui/liquid-glass-navbar';

interface BottomNavProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  onDecidir: () => void;
  onMenu: () => void;
}

/** Barra inferior mobile em vidro líquido. Início, Plano, Decidir, Menu. */
export const BottomNav = ({ currentStep, onStepChange, onDecidir, onMenu }: BottomNavProps) => {
  const icon = (I: typeof Home) => <I className="h-[18px] w-[18px]" strokeWidth={2} />;
  const items: LiquidNavItem[] = [
    { label: 'Início', icon: icon(Home), fx: 'pop' },
    { label: 'Plano', icon: icon(Target), fx: 'spin' },
    { label: 'Decidir', icon: icon(Sparkles), fx: 'drop' },
    { label: 'Menu', icon: icon(MenuIcon), fx: 'wave' },
  ];
  const active = currentStep === 3 ? 1 : 0;

  return (
    <div
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 flex justify-center pointer-events-none"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
    >
      <LiquidNavbar
        className="pointer-events-auto"
        tone="light"
        active={active}
        items={items}
        onSelect={(i) => {
          if (i === 0) onStepChange(0);
          else if (i === 1) onStepChange(3);
          else if (i === 2) onDecidir();
          else onMenu();
        }}
      />
    </div>
  );
};
