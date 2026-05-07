import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Cofrinho = Tables<'cofrinhos'>;

export const useCofrinhos = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['cofrinhos', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cofrinhos')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Cofrinho[];
    },
    enabled: !!user,
  });

  const createCofrinho = useMutation({
    mutationFn: async (data: { nome: string; cor?: string; orcamento_mensal?: number; saldo?: number }) => {
      const payload: TablesInsert<'cofrinhos'> = {
        user_id: user!.id,
        nome: data.nome,
        cor: data.cor ?? '#3B82F6',
        orcamento_mensal: data.orcamento_mensal ?? 0,
        saldo: data.saldo ?? 0,
      };
      const { data: result, error } = await supabase.from('cofrinhos').insert(payload).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cofrinhos'] }),
  });

  const updateCofrinho = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Cofrinho> & { id: string }) => {
      const { error } = await supabase.from('cofrinhos').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cofrinhos'] }),
  });

  const deleteCofrinho = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cofrinhos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cofrinhos'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const transferir = useMutation({
    mutationFn: async (data: { origem_id: string; destino_id: string; valor: number; descricao?: string }) => {
      if (!user) throw new Error('Sem usuário');
      const { error } = await supabase.rpc('transferir_entre_cofrinhos', {
        _user_id: user.id,
        _origem_id: data.origem_id,
        _destino_id: data.destino_id,
        _valor: data.valor,
        _descricao: data.descricao ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cofrinhos'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  // Trigger automatic monthly closure
  const fecharMes = useMutation({
    mutationFn: async () => {
      if (!user) return 0;
      const { data, error } = await supabase.rpc('fechar_mes_cofrinhos', { _user_id: user.id });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      if (count && count > 0) qc.invalidateQueries({ queryKey: ['cofrinhos'] });
    },
  });

  return {
    cofrinhos: query.data ?? [],
    isLoading: query.isLoading,
    createCofrinho,
    updateCofrinho,
    deleteCofrinho,
    fecharMes,
    transferir,
  };
};
