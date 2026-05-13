import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Transaction } from '@/hooks/useTransactions';

/**
 * Fetches the user's transactions from the last `monthsBack` months
 * (excluding the current month), used to compute historical averages
 * and trends in the Planning Center.
 */
export const useHistoricalTransactions = (monthsBack: number = 6) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['historical_transactions', user?.id, monthsBack],
    enabled: !!user,
    queryFn: async () => {
      const today = new Date();
      const from = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 1); // start of current month
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', from.toISOString().slice(0, 10))
        .lt('date', to.toISOString().slice(0, 10))
        .order('date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Transaction[];
    },
    staleTime: 5 * 60 * 1000,
  });
};