import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { FinancialDataService } from '@/services/FinancialDataService';

export type Transaction = Tables<'transactions'>;

export const useTransactions = (monthId: string | undefined) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
      queryClient.invalidateQueries({ queryKey: ['transactions', monthId] });
      queryClient.invalidateQueries({ queryKey: ['cofrinhos'] });
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Transaction> & { id: string }) => {
      const { error } = await supabase.from('transactions').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', monthId] });
      queryClient.invalidateQueries({ queryKey: ['cofrinhos'] });
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', monthId] });
      queryClient.invalidateQueries({ queryKey: ['cofrinhos'] });
    },
  });

  const transactions = transactionsQuery.data ?? [];
  const incomes = transactions.filter(t => t.type === 'income');
  const expenses = transactions.filter(t => t.type === 'expense');
  const totalIncome = incomes.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  return {
    transactions, incomes, expenses, totalIncome, totalExpense, balance,
    isLoading: transactionsQuery.isLoading,
    addTransaction, updateTransaction, deleteTransaction,
  };
};
