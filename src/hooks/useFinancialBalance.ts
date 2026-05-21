import { useMemo } from 'react';
import { useTransactions } from './useTransactions';
import { useMonths } from './useMonths';
import { useRecurringTransactions } from './useRecurringTransactions';

/**
 * FONTE ÚNICA OFICIAL DE SALDO DO FINZAP.
 *
 * Toda tela financeira deve consumir este hook em vez de calcular saldo localmente.
 *
 * Convenção:
 *  - `delta`            = soma(receitas) - soma(despesas) do mês (apenas movimento)
 *  - `currentBalance`   = initial_balance + delta (saldo atual contábil do mês)
 *  - `availableReal`    = currentBalance - compromissosFuturos + receitasFuturas
 *                         (saldo realmente livre considerando recorrências do restante do mês)
 *  - `projectedEndOfMonth` = projeção ao fim do ciclo ponderando o ritmo de gasto
 */
export const useFinancialBalance = (monthId: string | undefined) => {
  const tx = useTransactions(monthId);
  const { months } = useMonths();
  const { recorrencias } = useRecurringTransactions();

  const month = months.find(m => m.id === monthId);

  const initialBalance = Number(month?.initial_balance ?? 0);
  const totalIncome = tx.totalIncome;
  const totalExpense = tx.totalExpense;
  const delta = totalIncome - totalExpense;
  const currentBalance = initialBalance + delta;

  // Compromissos futuros e receitas futuras do mês corrente
  const { commitmentsRemaining, projectedIncomeRemaining, daysRemaining, isCurrentMonth } = useMemo(() => {
    if (!month) {
      return { commitmentsRemaining: 0, projectedIncomeRemaining: 0, daysRemaining: 0, isCurrentMonth: false };
    }
    const now = new Date();
    const isCurrent = month.year === now.getFullYear() && month.month === now.getMonth() + 1;
    const daysInMonth = new Date(month.year, month.month, 0).getDate();
    const today = isCurrent ? now.getDate() : daysInMonth;
    const remaining = Math.max(0, daysInMonth - today);

    if (!isCurrent) {
      return { commitmentsRemaining: 0, projectedIncomeRemaining: 0, daysRemaining: remaining, isCurrentMonth: false };
    }

    let commit = 0;
    let income = 0;
    recorrencias.forEach(r => {
      if (!r.ativo || !r.proxima_execucao) return;
      const target = new Date(r.proxima_execucao + 'T12:00:00');
      if (target.getFullYear() !== now.getFullYear() || target.getMonth() !== now.getMonth()) return;
      if (target.getTime() < now.getTime()) return; // já executada / no passado
      const val = Number(r.valor);
      if (r.tipo === 'despesa') commit += val;
      else income += val;
    });
    return { commitmentsRemaining: commit, projectedIncomeRemaining: income, daysRemaining: remaining, isCurrentMonth: true };
  }, [month, recorrencias]);

  const availableReal = currentBalance - commitmentsRemaining + projectedIncomeRemaining;

  const projectedEndOfMonth = useMemo(() => {
    if (!isCurrentMonth || !month) return currentBalance;
    const daysInMonth = new Date(month.year, month.month, 0).getDate();
    const today = daysInMonth - daysRemaining;
    const burn = today > 0 ? totalExpense / today : 0;
    // pondera 50% do ritmo para gastos NÃO recorrentes do restante do mês
    return availableReal - burn * daysRemaining * 0.5;
  }, [isCurrentMonth, month, daysRemaining, totalExpense, availableReal, currentBalance]);

  return {
    month,
    transactions: tx.transactions,
    incomes: tx.incomes,
    expenses: tx.expenses,
    incomeCount: tx.incomes.length,
    expenseCount: tx.expenses.length,
    isLoading: tx.isLoading,

    // saldos canônicos
    initialBalance,
    totalIncome,
    totalExpense,
    delta,
    currentBalance,
    commitmentsRemaining,
    projectedIncomeRemaining,
    availableReal,
    projectedEndOfMonth,
    daysRemaining,
    isCurrentMonth,

    // mutations (forward)
    addTransaction: tx.addTransaction,
    updateTransaction: tx.updateTransaction,
    deleteTransaction: tx.deleteTransaction,
  };
};

export type FinancialBalance = ReturnType<typeof useFinancialBalance>;
