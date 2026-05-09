import { useMemo } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { useCofrinhos } from '@/hooks/useCofrinhos';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import type { Month } from '@/hooks/useMonths';
import { buildInsights, type Insight } from '@/lib/insightsEngine';

/**
 * Hook que produz a lista de insights inteligentes do mês selecionado.
 * Reutiliza dados já carregados via React Query (sem fetch extra).
 */
export const useInsights = (month: Month | undefined) => {
  const { transactions, totalIncome, totalExpense, balance } = useTransactions(month?.id);
  const { cofrinhos } = useCofrinhos();
  const { data: recurring = [] } = useRecurringTransactions();

  const insights: Insight[] = useMemo(
    () =>
      buildInsights({
        month,
        transactions,
        cofrinhos,
        recurring,
        totalIncome,
        totalExpense,
        balance,
      }),
    [month, transactions, cofrinhos, recurring, totalIncome, totalExpense, balance],
  );

  const counts = useMemo(
    () => ({
      total: insights.length,
      critical: insights.filter(i => i.severity === 'critical').length,
      warning: insights.filter(i => i.severity === 'warning').length,
      info: insights.filter(i => i.severity === 'info').length,
    }),
    [insights],
  );

  return { insights, counts };
};