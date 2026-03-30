import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/constants';
import { TrendingUp, TrendingDown, Wallet, CheckCircle, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { Month } from '@/hooks/useMonths';

interface SummaryViewProps {
  month: Month;
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export const SummaryView = ({ month, totalIncome, totalExpense, balance }: SummaryViewProps) => {
  const now = new Date();
  const daysInMonth = new Date(month.year, month.month, 0).getDate();
  const currentDay = month.year === now.getFullYear() && month.month === now.getMonth() + 1
    ? Math.min(now.getDate(), daysInMonth) : daysInMonth;
  const monthProgress = Math.round((currentDay / daysInMonth) * 100);
  const finalBalance = balance + Number(month.initial_balance);
  const isPositive = finalBalance >= 0;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`flex items-center gap-3 p-4 rounded-xl ${isPositive ? 'bg-[hsl(var(--finzap-green)/0.1)]' : 'bg-[hsl(var(--finzap-red)/0.1)]'}`}>
        {isPositive
          ? <CheckCircle className="h-5 w-5 shrink-0" style={{ color: 'hsl(var(--finzap-green))' }} />
          : <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: 'hsl(var(--finzap-red))' }} />
        }
        <span className="font-medium" style={{ color: isPositive ? 'hsl(var(--finzap-green))' : 'hsl(var(--finzap-red))' }}>
          {isPositive ? 'Você está no positivo ✓' : 'Você está no negativo ✗'}
        </span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'hsl(var(--finzap-green) / 0.1)' }}>
                <TrendingUp className="h-5 w-5" style={{ color: 'hsl(var(--finzap-green))' }} />
              </div>
              <span className="text-sm text-muted-foreground">Receitas</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'hsl(var(--finzap-green))' }}>{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'hsl(var(--finzap-red) / 0.1)' }}>
                <TrendingDown className="h-5 w-5" style={{ color: 'hsl(var(--finzap-red))' }} />
              </div>
              <span className="text-sm text-muted-foreground">Despesas</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'hsl(var(--finzap-red))' }}>{formatCurrency(totalExpense)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Saldo</span>
            </div>
            <p className="text-2xl font-bold text-primary">{formatCurrency(finalBalance)}</p>
            {Number(month.initial_balance) > 0 && (
              <p className="text-xs text-muted-foreground mt-1">Saldo inicial: {formatCurrency(Number(month.initial_balance))}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Month progress */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium">Progresso do mês</span>
            <span className="text-sm text-muted-foreground">Dia {currentDay} de {daysInMonth}</span>
          </div>
          <Progress value={monthProgress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">{monthProgress}% do mês concluído</p>
        </CardContent>
      </Card>
    </div>
  );
};
