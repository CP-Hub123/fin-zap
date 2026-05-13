import { cn } from '@/lib/utils';
import { CheckCircle, BarChart3, Database, CreditCard, Target, Lock } from 'lucide-react';

const STEPS = [
  { label: 'Resumo', shortLabel: 'Resumo', icon: BarChart3 },
  { label: 'Transações', shortLabel: 'Dados', icon: Database },
  { label: 'Cartões', shortLabel: 'Cartões', icon: CreditCard },
  { label: 'Planejamento', shortLabel: 'Plano', icon: Target },
  { label: 'Fechamento', shortLabel: 'Fechar', icon: Lock },
];

interface StepperProps {
  currentStep: number;
  onStepChange: (step: number) => void;
}

export const Stepper = ({ currentStep, onStepChange }: StepperProps) => {
  return (
    <div className="flex items-center justify-between sm:justify-center gap-1 sm:gap-1.5">
      {STEPS.map((step, i) => {
        const StepIcon = step.icon;
        const isCompleted = i < currentStep;
        const isActive = i === currentStep;

        return (
          <button
            key={step.label}
            onClick={() => onStepChange(i)}
            className={cn(
              'btn-impulse flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2 rounded-lg text-[11px] sm:text-sm font-medium transition-all flex-1 sm:flex-none justify-center sm:justify-start min-h-[40px] min-w-0',
              isActive
                ? 'bg-gradient-zap text-primary-foreground shadow-lift -translate-y-0.5'
                : isCompleted
                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {isCompleted ? (
              <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            ) : (
              <StepIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            )}
            <span className="hidden sm:inline">{step.label}</span>
            <span className="sm:hidden truncate">{step.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
};
