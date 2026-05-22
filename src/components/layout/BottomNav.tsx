import { Home, Target, Sparkles, Menu as MenuIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  onDecidir: () => void;
  onMenu: () => void;
}

/**
 * Bottom navigation premium — mobile-first, translucent, safe-area aware.
 * Apenas 4 áreas: Início (Resumo), Plano (Planejamento), Decidir, Menu.
 * Não substitui o Stepper sequencial — oferece atalhos de alto nível.
 */
export const BottomNav = ({ currentStep, onStepChange, onDecidir, onMenu }: BottomNavProps) => {
  const items = [
    { key: 'home',    label: 'Início',  icon: Home,     active: currentStep === 0, onClick: () => onStepChange(0) },
    { key: 'plan',    label: 'Plano',   icon: Target,   active: currentStep === 3, onClick: () => onStepChange(3) },
    { key: 'decide',  label: 'Decidir', icon: Sparkles, active: false,             onClick: onDecidir, accent: true },
    { key: 'menu',    label: 'Menu',    icon: MenuIcon, active: false,             onClick: onMenu },
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/50 bg-card/85 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex items-stretch justify-around max-w-md mx-auto px-1">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <li key={item.key} className="flex-1">
              <button
                type="button"
                onClick={item.onClick}
                aria-current={item.active ? 'page' : undefined}
                aria-label={item.label}
                className={cn(
                  'group relative w-full h-14 flex flex-col items-center justify-center gap-0.5 transition-colors duration-200',
                  item.active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {item.active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full bg-primary" />
                )}
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center',
                    item.accent && 'text-primary',
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={item.active || item.accent ? 2.4 : 2} />
                </span>
                <span className={cn(
                  'text-[10px] font-medium tracking-tight leading-none',
                  item.accent && !item.active && 'text-primary',
                )}>
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};