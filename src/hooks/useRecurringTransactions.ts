import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { useFinzapInvalidate } from './useFinzapInvalidate';

export type RecurringTransaction = Tables<'recurring_transactions'>;

export const useRecurringTransactions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const invalidateFinancial = useFinzapInvalidate();

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
    onSuccess: () => {
      invalidateFinancial();
      toast.success('Recorrência criada');
    },
    onError: (e: any) => toast.error('Erro ao criar recorrência', { description: e?.message }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...data }: Partial<RecurringTransaction> & { id: string }) => {
      const { error } = await supabase
        .from('recurring_transactions')
        .update(data)
        .eq('id', id);
      if (error) throw error;
      return data;
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['recurring_transactions'] });
      const prev = queryClient.getQueryData<RecurringTransaction[]>(['recurring_transactions', user?.id]);
      if (prev) {
        queryClient.setQueryData<RecurringTransaction[]>(
          ['recurring_transactions', user?.id],
          prev.map(r => r.id === vars.id ? { ...r, ...vars } as RecurringTransaction : r),
        );
      }
      return { prev };
    },
    onError: (e: any, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['recurring_transactions', user?.id], ctx.prev);
      toast.error('Erro ao atualizar', { description: e?.message });
    },
    onSuccess: (data) => {
      invalidateFinancial();
      if (data && 'ativo' in data) {
        toast.success(data.ativo ? 'Recorrência ativada' : 'Recorrência pausada');
      } else {
        toast.success('Recorrência atualizada');
      }
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Recorrência não encontrada ou já removida.');
      }
    },
    onSuccess: () => {
      invalidateFinancial();
      toast.success('Recorrência removida');
    },
    onError: (e: any) => toast.error('Erro ao excluir', { description: e?.message }),
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
        invalidateFinancial();
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
    if (!user) return;
    // Guard diário: executar no máximo 1x por dia por usuário
    const key = `finzap:lastRecurringExec:${user.id}`;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(key) === today) return;
    localStorage.setItem(key, today);
    executar.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
};
