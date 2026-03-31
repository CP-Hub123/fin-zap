import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/constants';
import type { Transaction } from '@/hooks/useTransactions';
import type { BudgetPlan } from '@/hooks/useBudget';

interface BudgetViewProps {
  transactions: Transaction[];
  budgetPlans: BudgetPlan[];
  monthId: string;
  isClosed: boolean;
  expenseCategories: string[];
  onUpsertBudget: (data: { month_id: string; category: string; planned_amount: number }) => Promise<any>;
}

export const BudgetView = ({ transactions, budgetPlans, monthId, isClosed, expenseCategories, onUpsertBudget }: BudgetViewProps) => {
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const vals: Record<string, string> = {};
    budgetPlans.forEach(bp => { vals[bp.category] = String(bp.planned_amount); });
    setEditValues(vals);
  }, [budgetPlans]);

  const realizedByCategory = transactions
    .filter(t => t.type === 'expense' && t.status === 'realized')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const totalPlanned = Object.values(editValues).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const totalRealized = Object.values(realizedByCategory).reduce((s, v) => s + v, 0);
  const totalDiff = totalPlanned - totalRealized;

  const handleBlur = async (category: string) => {
    const val = parseFloat(editValues[category]) || 0;
    await onUpsertBudget({ month_id: monthId, category, planned_amount: val });
  };

  return (
    <div className="space-y-4">
      {/* Summary message */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          {totalPlanned > 0 ? (
            <p className="font-medium text-sm sm:text-base" style={{ color: totalDiff >= 0 ? 'hsl(var(--finzap-green))' : 'hsl(var(--finzap-red))' }}>
              {totalDiff >= 0
                ? `✓ Você economizou ${formatCurrency(totalDiff)}`
                : `✗ Você gastou ${formatCurrency(Math.abs(totalDiff))} a mais`
              }
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">Defina valores planejados para cada categoria para acompanhar seu orçamento.</p>
          )}
        </CardContent>
      </Card>

      {/* Category cards (mobile-friendly) */}
      <div className="space-y-3">
        {expenseCategories.map(cat => {
          const planned = parseFloat(editValues[cat]) || 0;
          const realized = realizedByCategory[cat] || 0;
          const diff = planned - realized;
          const pct = planned > 0 ? Math.min(Math.round((realized / planned) * 100), 100) : 0;
          const over = diff < 0;

          return (
            <Card key={cat} className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{cat}</p>
                  {planned > 0 && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${over ? 'bg-[hsl(var(--finzap-red)/0.1)] text-[hsl(var(--finzap-red))]' : 'bg-[hsl(var(--finzap-green)/0.1)] text-[hsl(var(--finzap-green))]'}`}>
                      {pct}%
                    </span>
                  )}
                </div>
                {planned > 0 && <Progress value={pct} className={`h-2 ${over ? '[&>div]:bg-[hsl(var(--finzap-red))]' : ''}`} />}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Planejado</p>
                    {isClosed ? (
                      <p className="text-sm font-semibold">{formatCurrency(planned)}</p>
                    ) : (
                      <Input
                        type="number" step="0.01"
                        className="h-9 text-center text-sm font-semibold mt-0.5"
                        value={editValues[cat] || ''}
                        onChange={e => setEditValues(v => ({ ...v, [cat]: e.target.value }))}
                        onBlur={() => handleBlur(cat)}
                        placeholder="0"
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Realizado</p>
                    <p className="text-sm font-semibold mt-1.5">{formatCurrency(realized)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Diferença</p>
                    <p className="text-sm font-semibold mt-1.5" style={{ color: diff >= 0 ? 'hsl(var(--finzap-green))' : 'hsl(var(--finzap-red))' }}>
                      {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Totals */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Planejado</p>
              <p className="text-base sm:text-lg font-bold">{formatCurrency(totalPlanned)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Realizado</p>
              <p className="text-base sm:text-lg font-bold">{formatCurrency(totalRealized)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Diferença</p>
              <p className="text-base sm:text-lg font-bold" style={{ color: totalDiff >= 0 ? 'hsl(var(--finzap-green))' : 'hsl(var(--finzap-red))' }}>
                {totalDiff >= 0 ? '+' : ''}{formatCurrency(totalDiff)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
