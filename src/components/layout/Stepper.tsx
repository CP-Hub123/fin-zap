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

/** Segmented control: one clear selection, 44px targets, arrow-key navigation. */
export const Stepper = ({ currentStep, onStepChange }: StepperProps) => {
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') onStepChange(Math.min(STEPS.length - 1, currentStep + 1));
    if (e.key === 'ArrowLeft') onStepChange(Math.max(0, currentStep - 1));
  };
  return (
    <nav aria-label="Etapas do mês" className="w-full sm:flex sm:justify-center">
      <div
        role="tablist"
        onKeyDown={onKey}
        className="grid grid-cols-4 gap-1 rounded-2xl bg-muted p-1 sm:inline-grid sm:min-w-[440px]"
      >
        {STEPS.map((step, i) => {
          const isActive = i === currentStep;
          return (
            <button
              key={step.label}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onStepChange(i)}
              className={cn(
                'min-h-[40px] min-w-0 rounded-xl px-1 text-[12px] sm:px-2 sm:text-[13px] tracking-tight font-semibold transition-all duration-200',
                isActive
                  ? 'bg-card text-foreground shadow-card-premium'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {step.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
