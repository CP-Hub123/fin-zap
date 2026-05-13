import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description: string;
  hints?: string[];
  primaryAction?: { label: string; onClick: () => void; icon?: LucideIcon };
  secondaryAction?: { label: string; onClick: () => void };
  tone?: 'primary' | 'success' | 'warning' | 'neutral';
  preview?: ReactNode;
  compact?: boolean;
  className?: string;
}

const TONES = {
  primary: {
    halo: 'from-primary/15 via-primary/5 to-transparent',
    iconBg: 'bg-primary/10 text-primary ring-primary/15',
    chip: 'bg-primary/10 text-primary',
  },
  success: {
    halo: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/15',
    chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    halo: 'from-amber-500/15 via-amber-500/5 to-transparent',
    iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/15',
    chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  neutral: {
    halo: 'from-muted-foreground/10 via-muted-foreground/5 to-transparent',
    iconBg: 'bg-muted text-muted-foreground ring-border/60',
    chip: 'bg-muted text-muted-foreground',
  },
} as const;

export const EmptyState = ({
  icon: Icon,
  eyebrow,
  title,
  description,
  hints,
  primaryAction,
  secondaryAction,
  tone = 'primary',
  preview,
  compact,
  className,
}: EmptyStateProps) => {
  const t = TONES[tone];
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-dashed border-border/60 bg-card/60',
        compact ? 'px-5 py-7' : 'px-5 py-9 sm:py-11',
        className,
      )}
    >
      <div
        aria-hidden
        className={cn('pointer-events-none absolute inset-x-0 -top-24 h-48 bg-gradient-to-b blur-2xl opacity-80', t.halo)}
      />
      <div className="relative flex flex-col items-center text-center">
        <div
          className={cn(
            'flex items-center justify-center rounded-2xl ring-1 mb-4',
            compact ? 'h-11 w-11' : 'h-14 w-14',
            t.iconBg,
          )}
        >
          <Icon className={compact ? 'h-5 w-5' : 'h-6 w-6'} strokeWidth={1.75} />
        </div>
        {eyebrow && (
          <span className={cn('mb-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider', t.chip)}>
            {eyebrow}
          </span>
        )}
        <h3 className={cn('font-semibold tracking-tight text-foreground', compact ? 'text-base' : 'text-lg')}>{title}</h3>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>

        {preview && <div className="mt-5 w-full max-w-sm">{preview}</div>}

        {hints && hints.length > 0 && (
          <ul className="mt-5 w-full max-w-sm space-y-1.5 text-left">
            {hints.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-[12.5px] text-muted-foreground">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
                <span className="leading-relaxed">{h}</span>
              </li>
            ))}
          </ul>
        )}

        {(primaryAction || secondaryAction) && (
          <div className="mt-6 flex w-full max-w-sm flex-col-reverse sm:flex-row sm:justify-center gap-2">
            {secondaryAction && (
              <Button variant="ghost" onClick={secondaryAction.onClick} className="h-11 rounded-full">
                {secondaryAction.label}
              </Button>
            )}
            {primaryAction && (
              <Button onClick={primaryAction.onClick} className="h-11 rounded-full px-5">
                {primaryAction.icon && <primaryAction.icon className="h-4 w-4 mr-1.5" />}
                {primaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
