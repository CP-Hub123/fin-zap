import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';

const STEPS = ['Resumo', 'Base de Dados', 'Planejamento', 'Fechamento'];

interface StepperProps {
  currentStep: number;
  onStepChange: (step: number) => void;
}

export const Stepper = ({ currentStep, onStepChange }: StepperProps) => {
  return (
    <div className="flex items-center justify-center gap-1 md:gap-2">
      {STEPS.map((label, i) => (
        <button
          key={label}
          onClick={() => onStepChange(i)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
            i === currentStep
              ? 'bg-primary text-primary-foreground shadow-sm'
              : i < currentStep
              ? 'bg-primary/10 text-primary hover:bg-primary/20'
              : 'text-muted-foreground hover:bg-muted'
          )}
        >
          {i < currentStep ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <span className={cn(
              'flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold',
              i === currentStep ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}>
              {i + 1}
            </span>
          )}
          <span className="hidden md:inline">{label}</span>
        </button>
      ))}
    </div>
  );
};
