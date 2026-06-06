import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { FinancialDataService } from '@/services/FinancialDataService';
import { useFinzapInvalidate } from './useFinzapInvalidate';
import { computeMonthTotals } from '@/lib/financialEngine';

export type Transaction = Tables<'transactions'>;

export const useTransactions = (monthId: string | undefined) => {
  const { user } = useAuth();
  const invalidateFinancial = useFinzapInvalidate();

  const transactionsQuery = useQuery({
    queryKey: ['transactions', monthId],
    queryFn: async () => {
      return FinancialDataService.getTransactionsByMonth(monthId!);
    },
    enabled: !!monthId,
  });

  const addTransaction = useMutation({
    mutationFn: async (data: Omit<TablesInsert<'transactions'>, 'user_id'> & { user_id?: string }) => {
      return FinancialDataService.createManualTransaction({
        ...data,
        user_id: data.user_id ?? user!.id,
      });
    },
    onSuccess: () => {
      invalidateFinancial();
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Transaction> & { id: string }) => {
      const { error } = await supabase.from('transactions').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateFinancial();
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateFinancial();
    },
  });

  const transactions = transactionsQuery.data ?? [];
  const incomes = transactions.filter(t => t.type === 'income');
  const expenses = transactions.filter(t => t.type === 'expense');
  // Totais canônicos (fix P0 #2): respeitam `impacta_saldo` — alinhado com o PDF.
  const { totalIncome, totalExpense, delta: balance } = computeMonthTotals(transactions as any);

  return {
    transactions, incomes, expenses, totalIncome, totalExpense, balance,
    isLoading: transactionsQuery.isLoading,
    addTransaction, updateTransaction, deleteTransaction,
  };
};
