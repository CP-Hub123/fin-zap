import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MONTH_NAMES } from '@/lib/constants';
import type { Month } from '@/hooks/useMonths';

interface MonthSelectorProps {
  months: Month[];
  selectedMonthId: string | undefined;
  onSelect: (id: string) => void;
}

export const MonthSelector = ({ months, selectedMonthId, onSelect }: MonthSelectorProps) => {
  return (
    <Select value={selectedMonthId} onValueChange={onSelect}>
      <SelectTrigger className="w-[140px] sm:w-[200px] bg-card min-h-[44px] sm:min-h-0">
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
