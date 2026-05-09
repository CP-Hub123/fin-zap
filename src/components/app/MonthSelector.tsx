import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MONTH_NAMES } from '@/lib/constants';
import type { Month } from '@/hooks/useMonths';
import { Calendar, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonthSelectorProps {
  months: Month[];
  selectedMonthId: string | undefined;
  onSelect: (id: string) => void;
  variant?: 'compact' | 'pill';
  className?: string;
}

export const MonthSelector = ({ months, selectedMonthId, onSelect, variant = 'compact', className }: MonthSelectorProps) => {
  const selected = months.find(m => m.id === selectedMonthId);
  const isClosed = selected?.status === 'closed';

  if (variant === 'pill') {
    return (
      <Select value={selectedMonthId} onValueChange={onSelect}>
        <SelectTrigger
          className={cn(
            'group inline-flex w-auto max-w-full items-center gap-2 rounded-full border border-border/60',
            'bg-card/80 backdrop-blur px-4 h-10 text-sm font-semibold tracking-tight',
            'shadow-card-premium hover:border-primary/40 hover:shadow-elevated transition-all',
            'focus:ring-2 focus:ring-ring/40',
            className,
          )}
        >
          <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate">
            {selected ? `${MONTH_NAMES[selected.month - 1]} ${selected.year}` : 'Selecione o mês'}
          </span>
          {isClosed && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
        </SelectTrigger>
        <SelectContent align="start">
          {months.map(m => (
            <SelectItem key={m.id} value={m.id}>
              {MONTH_NAMES[m.month - 1]} {m.year}
              {m.status === 'closed' && ' 🔒'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select value={selectedMonthId} onValueChange={onSelect}>
      <SelectTrigger className={cn('w-[140px] sm:w-[180px] bg-card min-h-[40px] rounded-full text-sm', className)}>
        <SelectValue placeholder="Selecione" />
      </SelectTrigger>
      <SelectContent>
        {months.map(m => (
          <SelectItem key={m.id} value={m.id}>
            {MONTH_NAMES[m.month - 1]} {m.year}
            {m.status === 'closed' && ' 🔒'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
