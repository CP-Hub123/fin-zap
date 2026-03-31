import { cn } from '@/lib/utils';
import { CheckCircle, BarChart3, Database, Target, Lock } from 'lucide-react';

const STEPS = [
  { label: 'Resumo', shortLabel: 'Resumo', icon: BarChart3 },
  { label: 'Transações', shortLabel: 'Dados', icon: Database },
  { label: 'Planejamento', shortLabel: 'Plano', icon: Target },
  { label: 'Fechamento', shortLabel: 'Fechar', icon: Lock },
];

interface StepperProps {
  currentStep: number;
  onStepChange: (step: number) => void;
}

export const Stepper = ({ currentStep, onStepChange }: StepperProps) => {
  return (
    <div className="flex items-center justify-between sm:justify-center gap-1 sm:gap-2">
      {STEPS.map((step, i) => {
        const StepIcon = step.icon;
        const isCompleted = i < currentStep;
        const isActive = i === currentStep;

        return (
          <button
            key={step.label}
            onClick={() => onStepChange(i)}
            className={cn(
              'flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex-1 sm:flex-none justify-center sm:justify-start min-h-[40px]',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : isCompleted
                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {isCompleted ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <StepIcon className="h-4 w-4 shrink-0" />
            )}
            <span className="hidden sm:inline">{step.label}</span>
            <span className="sm:hidden text-[11px]">{step.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
};
