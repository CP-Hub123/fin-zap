import { cn } from '@/lib/utils';

const STEPS = [
  { label: 'Resumo' },
  { label: 'Transações' },
  { label: 'Cartões' },
  { label: 'Plano' },
];

interface StepperProps {
  currentStep: number;
  onStepChange: (step: number) => void;
}

/**
 * Stepper leve e contextual — sem pills coloridas, sem gradiente.
 * Indicador é apenas underline + peso tipográfico. Quase invisível quando inativo.
 */
export const Stepper = ({ currentStep, onStepChange }: StepperProps) => {
  return (
    <nav
      aria-label="Etapas do mês"
      className="flex items-center justify-between sm:justify-center gap-1 sm:gap-2 overflow-x-auto"
    >
      {STEPS.map((step, i) => {
        const isActive = i === currentStep;
        const isCompleted = i < currentStep;
        return (
          <button
            key={step.label}
            type="button"
            onClick={() => onStepChange(i)}
            aria-current={isActive ? 'step' : undefined}
            className={cn(
              'relative shrink-0 px-2.5 sm:px-3 py-1.5 text-[12px] sm:text-[13px] tracking-tight transition-colors duration-200 min-h-[36px]',
              isActive
                ? 'text-foreground font-semibold'
                : isCompleted
                ? 'text-muted-foreground hover:text-foreground font-medium'
                : 'text-muted-foreground/70 hover:text-foreground font-medium',
            )}
          >
            {step.label}
            <span
              className={cn(
                'absolute left-1/2 -translate-x-1/2 -bottom-0.5 h-[2px] rounded-full transition-all duration-300',
                isActive ? 'w-6 bg-primary' : 'w-0 bg-transparent',
              )}
            />
          </button>
        );
      })}
    </nav>
  );
};
