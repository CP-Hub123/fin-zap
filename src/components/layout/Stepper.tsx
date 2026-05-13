import { cn } from '@/lib/utils';
import { CheckCircle, BarChart3, Database, CreditCard, Target, Lock } from 'lucide-react';

const STEPS = [
  { label: 'Resumo', icon: BarChart3 },
  { label: 'Transações', icon: Database },
  { label: 'Cartões', icon: CreditCard },
  { label: 'Planejamento', icon: Target },
  { label: 'Fechamento', icon: Lock },
];

interface StepperProps {
  currentStep: number;
  onStepChange: (step: number) => void;
}

export const Stepper = ({ currentStep, onStepChange }: StepperProps) => {
  return (
    <nav
      aria-label="Etapas do mês"
      className="flex items-center justify-between sm:justify-center gap-1 sm:gap-1.5"
    >
      {STEPS.map((step, i) => {
        const StepIcon = step.icon;
        const isCompleted = i < currentStep;
        const isActive = i === currentStep;
        const Icon = isCompleted ? CheckCircle : StepIcon;

        return (
          <button
            key={step.label}
            onClick={() => onStepChange(i)}
            aria-label={step.label}
            aria-current={isActive ? 'step' : undefined}
            className={cn(
              'btn-impulse group flex items-center gap-1.5 rounded-full transition-all duration-300 min-h-[40px] min-w-0 overflow-hidden',
              // Mobile: icon-only by default, expands with label when active
              isActive
                ? 'flex-[2] sm:flex-none px-3 sm:px-3.5 py-2 bg-gradient-zap text-primary-foreground shadow-lift'
                : isCompleted
                ? 'flex-1 sm:flex-none justify-center px-2 sm:px-3 py-2 bg-primary/10 text-primary hover:bg-primary/15'
                : 'flex-1 sm:flex-none justify-center px-2 sm:px-3 py-2 text-muted-foreground hover:bg-muted/60',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {/* Desktop: always show label. Mobile: only active shows label. */}
            <span
              className={cn(
                'hidden sm:inline text-sm font-medium whitespace-nowrap',
              )}
            >
              {step.label}
            </span>
            {isActive && (
              <span className="sm:hidden text-[12px] font-semibold whitespace-nowrap tracking-tight">
                {step.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
