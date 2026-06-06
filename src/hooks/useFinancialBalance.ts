import { useMemo } from 'react';
import { useTransactions } from './useTransactions';
import { useMonths } from './useMonths';
import { useRecurringTransactions } from './useRecurringTransactions';
import { useCofrinhos } from './useCofrinhos';
import { useCreditCards } from './useCreditCards';
import {
  computeUpcomingRecurring,
  computeCardsPendingThisMonth,
  computeBalances,
  computeSaldoPrevisto,
} from '@/lib/financialEngine';

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
  const { cofrinhos } = useCofrinhos();
  const { installments, purchases } = useCreditCards();

  const month = months.find(m => m.id === monthId);

  const initialBalance = Number(month?.initial_balance ?? 0);
  const totalIncome = tx.totalIncome;
  const totalExpense = tx.totalExpense;
  // delta/currentBalance vêm da engine canônica (totals já respeitam impacta_saldo)
  const delta = totalIncome - totalExpense;
  const currentBalance = initialBalance + delta;

  // Compromissos futuros e receitas futuras do mês corrente (engine canônica)
  const {
    commitmentsRemaining,
    commitmentsRemainingFree,
    projectedIncomeRemaining,
    daysRemaining,
    isCurrentMonth,
  } = useMemo(() => {
    if (!month) {
      return {
        commitmentsRemaining: 0,
        commitmentsRemainingFree: 0,
        projectedIncomeRemaining: 0,
        daysRemaining: 0,
        isCurrentMonth: false,
      };
    }
    const now = new Date();
    const isCurrent = month.year === now.getFullYear() && month.month === now.getMonth() + 1;
    const daysInMonth = new Date(month.year, month.month, 0).getDate();
    const today = isCurrent ? now.getDate() : daysInMonth;
    const remaining = Math.max(0, daysInMonth - today);

    if (!isCurrent) {
      return {
        commitmentsRemaining: 0,
        commitmentsRemainingFree: 0,
        projectedIncomeRemaining: 0,
        daysRemaining: remaining,
        isCurrentMonth: false,
      };
    }
    const eng = computeUpcomingRecurring(recorrencias as any, now);
    return {
      commitmentsRemaining: eng.commitmentsRemaining,
      commitmentsRemainingFree: eng.commitmentsRemainingFree,
      projectedIncomeRemaining: eng.projectedIncomeRemaining,
      daysRemaining: remaining,
      isCurrentMonth: true,
    };
  }, [month, recorrencias]);

  const availableReal = currentBalance - commitmentsRemaining + projectedIncomeRemaining;

  // ───────────────── Fonte única de verdade financeira ─────────────────
  // Saldo total = saldo contábil corrente do mês (igual a currentBalance)
  // Saldo reservado = soma do saldo protegido em todos os cofrinhos do usuário
  // Cartões pendentes deste mês = parcelas planejadas/não realizadas do mês
  // Saldo livre = total - reservado - compromissos restantes - cartões pendentes + receitas futuras
  // Saldo previsto = projeção ao fim do mês (já considerando ritmo)
  const saldoReservado = useMemo(
    () => cofrinhos.reduce((s, c) => s + Number(c.saldo ?? 0), 0),
    [cofrinhos]
  );

  // Mapa compra→cofrinho para segregar parcelas vinculadas a reservas
  const purchaseToCofrinho = useMemo(() => {
    const m = new Map<string, string | null>();
    (purchases || []).forEach((p: any) => m.set(p.id, p.cofrinho_id ?? null));
    return m;
  }, [purchases]);

  const cardsPendingBreakdown = useMemo(
    () => computeCardsPendingThisMonth(installments as any, monthId, purchaseToCofrinho),
    [installments, monthId, purchaseToCofrinho],
  );
  const cardsPendingThisMonth = cardsPendingBreakdown.total;

  // Fix P0 #1: saldoLivre NÃO subtrai compromissos/cartões vinculados a cofrinho
  // (eles serão pagos contra `saldoReservado` quando executados).
  const { saldoTotal, saldoLivre } = computeBalances({
    initialBalance,
    totalIncome,
    totalExpense,
    saldoReservado,
    commitmentsRemainingFree,
    projectedIncomeRemaining,
    cardsPendingFree: cardsPendingBreakdown.free,
  });

  const projectedEndOfMonth = useMemo(() => {
    if (!isCurrentMonth || !month) return currentBalance;
    const daysInMonth = new Date(month.year, month.month, 0).getDate();
    const daysElapsed = daysInMonth - daysRemaining;
    return computeSaldoPrevisto({
      isCurrentMonth,
      saldoLivre,
      saldoTotal,
      totalExpense,
      daysElapsed,
      daysRemaining,
    });
  }, [isCurrentMonth, month, daysRemaining, totalExpense, saldoLivre, saldoTotal, currentBalance]);

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

    // engine premium (fonte única de verdade)
    saldoTotal,
    saldoReservado,
    cardsPendingThisMonth,
    saldoLivre,
    saldoPrevisto: projectedEndOfMonth,

    // mutations (forward)
    addTransaction: tx.addTransaction,
    updateTransaction: tx.updateTransaction,
    deleteTransaction: tx.deleteTransaction,
  };
};

export type FinancialBalance = ReturnType<typeof useFinancialBalance>;
