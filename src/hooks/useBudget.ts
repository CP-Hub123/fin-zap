import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useFinzapInvalidate } from './useFinzapInvalidate';

export type BudgetPlan = Tables<'budget_plans'>;

export const useBudget = (monthId: string | undefined) => {
  const invalidateFinancial = useFinzapInvalidate();

  const budgetQuery = useQuery({
    queryKey: ['budget_plans', monthId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_plans')
        .select('*')
        .eq('month_id', monthId!);
      if (error) throw error;
      return data as BudgetPlan[];
    },
    enabled: !!monthId,
  });

  const upsertBudget = useMutation({
    mutationFn: async (data: { month_id: string; category: string; planned_amount: number }) => {
      const { error } = await supabase
        .from('budget_plans')
        .upsert(data, { onConflict: 'month_id,category' });
      if (error) throw error;
    },
    onSuccess: () => invalidateFinancial(),
  });

  return { budgetPlans: budgetQuery.data ?? [], isLoading: budgetQuery.isLoading, upsertBudget };
};
