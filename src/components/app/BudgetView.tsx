import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
    <div className="space-y-6">
      {/* Summary message */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          {totalPlanned > 0 ? (
            <p className="font-medium" style={{ color: totalDiff >= 0 ? 'hsl(var(--finzap-green))' : 'hsl(var(--finzap-red))' }}>
              {totalDiff >= 0
                ? `✓ Você economizou ${formatCurrency(totalDiff)}`
                : `✗ Você gastou ${formatCurrency(Math.abs(totalDiff))} a mais`
              }
            </p>
          ) : (
            <p className="text-muted-foreground">Defina valores planejados para cada categoria para acompanhar seu orçamento.</p>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead>Planejado</TableHead>
              <TableHead>Realizado</TableHead>
              <TableHead>Diferença</TableHead>
              <TableHead>Progresso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenseCategories.map(cat => {
              const planned = parseFloat(editValues[cat]) || 0;
              const realized = realizedByCategory[cat] || 0;
              const diff = planned - realized;
              const pct = planned > 0 ? Math.min(Math.round((realized / planned) * 100), 100) : 0;

              return (
                <TableRow key={cat}>
                  <TableCell className="font-medium">{cat}</TableCell>
                  <TableCell>
                    {isClosed ? (
                      formatCurrency(planned)
                    ) : (
                      <Input
                        type="number" step="0.01" className="w-28 h-8"
                        value={editValues[cat] || ''}
                        onChange={e => setEditValues(v => ({ ...v, [cat]: e.target.value }))}
                        onBlur={() => handleBlur(cat)}
                        placeholder="0,00"
                      />
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(realized)}</TableCell>
                  <TableCell style={{ color: diff >= 0 ? 'hsl(var(--finzap-green))' : 'hsl(var(--finzap-red))' }}>
                    {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                  </TableCell>
                  <TableCell className="w-32">
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-10">{pct}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Totals */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Total Planejado</p>
              <p className="text-lg font-bold">{formatCurrency(totalPlanned)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Realizado</p>
              <p className="text-lg font-bold">{formatCurrency(totalRealized)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Diferença</p>
              <p className="text-lg font-bold" style={{ color: totalDiff >= 0 ? 'hsl(var(--finzap-green))' : 'hsl(var(--finzap-red))' }}>
                {totalDiff >= 0 ? '+' : ''}{formatCurrency(totalDiff)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
