import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

export type Month = Tables<'months'>;

export const useMonths = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const monthsQuery = useQuery({
    queryKey: ['months', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('months')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      if (error) throw error;
      return data as Month[];
    },
    enabled: !!user,
  });

  const createMonth = useMutation({
    mutationFn: async (data: { month: number; year: number; initial_balance: number }) => {
      const { data: result, error } = await supabase
        .from('months')
        .insert({ ...data, user_id: user!.id, status: 'in_progress' as const })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['months'] }),
  });

  const updateMonthStatus = useMutation({
    mutationFn: async ({ id, status, closed_at }: { id: string; status: string; closed_at?: string | null }) => {
      const { error } = await supabase
        .from('months')
        .update({ status: status as any, closed_at })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['months'] }),
  });

  const updateMonth = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; initial_balance?: number; status?: string }) => {
      const { error } = await supabase
        .from('months')
        .update(patch as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['months'] }),
  });

  const deleteMonth = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('delete_month_cascade' as any, { _month_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['months'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cofrinhos'] });
    },
  });

  return {
    months: monthsQuery.data ?? [],
    isLoading: monthsQuery.isLoading,
    createMonth,
    updateMonthStatus,
    updateMonth,
    deleteMonth,
  };
};
