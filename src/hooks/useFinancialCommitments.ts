import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useFinzapInvalidate } from './useFinzapInvalidate';

export type FinancialCommitment = Tables<'financial_commitments'>;
export type CommitmentType = 'receivable' | 'payable';
export type CommitmentStatus = 'pending' | 'paid' | 'received' | 'cancelled';

export const useFinancialCommitments = () => {
  const { user } = useAuth();
  const invalidate = useFinzapInvalidate();

  const query = useQuery({
    queryKey: ['financial_commitments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_commitments')
        .select('*')
        .order('due_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as FinancialCommitment[];
    },
    enabled: !!user?.id,
  });

  const create = useMutation({
    mutationFn: async (
      input: Omit<TablesInsert<'financial_commitments'>, 'user_id' | 'status'> & {
        status?: CommitmentStatus;
      },
    ) => {
      const payload: TablesInsert<'financial_commitments'> = {
        ...input,
        user_id: user!.id,
        status: input.status ?? 'pending',
      };
      const { data, error } = await supabase
        .from('financial_commitments')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as FinancialCommitment;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: TablesUpdate<'financial_commitments'> & { id: string }) => {
      const { error } = await supabase
        .from('financial_commitments')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('financial_commitments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /**
   * Conclui o compromisso convertendo em transação no mês atual.
   * Caso `createTransaction = false`, apenas marca como pago/recebido sem gerar lançamento.
   */
  const conclude = useMutation({
    mutationFn: async ({
      commitment,
      createTransaction,
    }: {
      commitment: FinancialCommitment;
      createTransaction: boolean;
    }) => {
      if (createTransaction) {
        const { error } = await supabase.rpc('convert_commitment_to_transaction', {
          _commitment_id: commitment.id,
        });
        if (error) throw error;
      } else {
        const newStatus: CommitmentStatus =
          commitment.type === 'receivable' ? 'received' : 'paid';
        const { error } = await supabase
          .from('financial_commitments')
          .update({ status: newStatus })
          .eq('id', commitment.id);
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financial_commitments')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    commitments: query.data ?? [],
    isLoading: query.isLoading,
    create,
    update,
    remove,
    conclude,
    cancel,
  };
};