import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type BudgetPlan = Tables<'budget_plans'>;

export const useBudget = (monthId: string | undefined) => {
  const queryClient = useQueryClient();

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budget_plans', monthId] }),
  });

  return { budgetPlans: budgetQuery.data ?? [], isLoading: budgetQuery.isLoading, upsertBudget };
};
