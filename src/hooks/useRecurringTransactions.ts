import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type RecurringTransaction = Tables<'recurring_transactions'>;

export const useRecurringTransactions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['recurring_transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as RecurringTransaction[];
    },
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async (data: Omit<TablesInsert<'recurring_transactions'>, 'user_id'>) => {
      const { error } = await supabase
        .from('recurring_transactions')
        .insert({ ...data, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring_transactions'] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...data }: Partial<RecurringTransaction> & { id: string }) => {
      const { error } = await supabase
        .from('recurring_transactions')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring_transactions'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring_transactions'] }),
  });

  const executar = useMutation({
    mutationFn: async () => {
      if (!user) return 0;
      const { data, error } = await supabase.rpc('executar_recorrencias_usuario', {
        _user_id: user.id,
      });
      if (error) throw error;
      return (data as number) ?? 0;
    },
    onSuccess: (count) => {
      if (count > 0) {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['cofrinhos'] });
        queryClient.invalidateQueries({ queryKey: ['months'] });
        queryClient.invalidateQueries({ queryKey: ['recurring_transactions'] });
      }
    },
  });

  return {
    recorrencias: query.data ?? [],
    isLoading: query.isLoading,
    create,
    update,
    remove,
    executar,
  };
};

/** Hook utilitário: executa recorrências automaticamente ao carregar o app. */
export const useAutoExecutarRecorrencias = () => {
  const { user } = useAuth();
  const { executar } = useRecurringTransactions();

  useEffect(() => {
    if (user) executar.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
};
