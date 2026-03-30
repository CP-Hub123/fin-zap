import type { Transaction } from '@/hooks/useTransactions';
import type { Month } from '@/hooks/useMonths';
import { AlertTriangle, Info } from 'lucide-react';

interface NudgeBannerProps {
  month: Month | undefined;
  transactions: Transaction[];
}

export const NudgeBanner = ({ month, transactions }: NudgeBannerProps) => {
  if (!month) return null;

  const incomes = transactions.filter(t => t.type === 'income');
  const expenses = transactions.filter(t => t.type === 'expense');
  const totalIncome = incomes.reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = expenses.reduce((s, t) => s + Number(t.amount), 0);

  const nudges: { icon: React.ReactNode; text: string; color: string }[] = [];

  if (incomes.length === 0) {
    nudges.push({ icon: <Info className="h-4 w-4" />, text: 'Você ainda não registrou nenhuma receita.', color: 'bg-primary/10 text-primary' });
  }
  if (expenses.length === 0) {
    nudges.push({ icon: <Info className="h-4 w-4" />, text: 'Você ainda não registrou nenhuma despesa.', color: 'bg-primary/10 text-primary' });
  }
  if (totalExpense > totalIncome && totalIncome > 0) {
    nudges.push({ icon: <AlertTriangle className="h-4 w-4" />, text: 'Suas despesas ultrapassaram suas receitas!', color: 'bg-[hsl(var(--finzap-red)/0.1)] text-[hsl(var(--finzap-red))]' });
  }
  if (totalExpense > 0 && totalIncome > 0 && totalExpense / totalIncome > 0.8 && totalExpense <= totalIncome) {
    nudges.push({ icon: <AlertTriangle className="h-4 w-4" />, text: 'Seu orçamento está perto do limite (80%+).', color: 'bg-amber-50 text-amber-700' });
  }
  if (month.status === 'in_progress' && incomes.length > 0 && expenses.length > 0) {
    nudges.push({ icon: <Info className="h-4 w-4" />, text: 'Hora de fechar o mês? Vá até a aba Fechamento.', color: 'bg-primary/10 text-primary' });
  }

  if (nudges.length === 0) return null;

  return (
    <div className="space-y-2">
      {nudges.slice(0, 2).map((n, i) => (
        <div key={i} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium ${n.color}`}>
          {n.icon}
          {n.text}
        </div>
      ))}
    </div>
  );
};
