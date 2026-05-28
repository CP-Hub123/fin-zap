import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useFinzapInvalidate } from './useFinzapInvalidate';

export interface CreditCard {
  id: string;
  user_id: string;
  nome: string;
  bandeira: string;
  cor: string;
  limite: number;
  fechamento_dia: number;
  vencimento_dia: number;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface CardPurchase {
  id: string;
  user_id: string;
  card_id: string;
  descricao: string;
  valor_total: number;
  parcelas: number;
  data_compra: string;
  categoria: string | null;
  cofrinho_id: string | null;
  created_at: string;
}

export interface CardInstallment {
  id: string;
  card_purchase_id: string;
  parcela_num: number;
  amount: number;
  date: string;
  month_id: string;
  status: string;
}

export const useCreditCards = () => {
  const { user } = useAuth();
  const invalidateFinancial = useFinzapInvalidate();

  const cardsQ = useQuery({
    queryKey: ['credit_cards', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_cards' as any)
        .select('*')
        .order('ordem', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CreditCard[];
    },
  });

  const purchasesQ = useQuery({
    queryKey: ['credit_card_purchases', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_card_purchases' as any)
        .select('*')
        .order('data_compra', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CardPurchase[];
    },
  });

  const installmentsQ = useQuery({
    queryKey: ['credit_card_installments', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, card_purchase_id, parcela_num, amount, date, month_id, status')
        .not('card_purchase_id', 'is', null)
        .order('date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CardInstallment[];
    },
  });

  const invalidateAll = () => invalidateFinancial();

  const createCard = useMutation({
    mutationFn: async (input: Omit<CreditCard, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'ordem'> & { ordem?: number }) => {
      const { error } = await supabase
        .from('credit_cards' as any)
        .insert({ ...input, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success('Cartão adicionado'); },
    onError: (e: any) => toast.error('Erro ao adicionar cartão', { description: e?.message }),
  });

  const updateCard = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreditCard> & { id: string }) => {
      const { error } = await supabase
        .from('credit_cards' as any)
        .update(data as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success('Cartão atualizado'); },
    onError: (e: any) => toast.error('Erro ao atualizar', { description: e?.message }),
  });

  const deleteCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('delete_credit_card_cascade' as any, { _card_id: id });
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success('Cartão removido'); },
    onError: (e: any) => toast.error('Erro ao excluir', { description: e?.message }),
  });

  const createPurchase = useMutation({
    mutationFn: async (input: Omit<CardPurchase, 'id' | 'user_id' | 'created_at'>) => {
      const { error } = await supabase
        .from('credit_card_purchases' as any)
        .insert({ ...input, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success('Compra registrada'); },
    onError: (e: any) => toast.error('Erro ao registrar compra', { description: e?.message }),
  });

  const deletePurchase = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('delete_card_purchase_safe' as any, { _purchase_id: id });
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success('Compra removida'); },
    onError: (e: any) => toast.error('Erro ao excluir', { description: e?.message }),
  });

  const updatePurchase = useMutation({
    mutationFn: async (input: {
      id: string;
      descricao: string;
      valor_total: number;
      parcelas: number;
      card_id: string;
      data_compra: string;
      categoria: string | null;
    }) => {
      const { error } = await supabase.rpc('update_card_purchase_safe' as any, {
        _purchase_id: input.id,
        _descricao: input.descricao,
        _valor_total: input.valor_total,
        _parcelas: input.parcelas,
        _card_id: input.card_id,
        _data_compra: input.data_compra,
        _categoria: input.categoria,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success('Compra atualizada'); },
    onError: (e: any) => toast.error('Erro ao atualizar', { description: e?.message }),
  });

  const fetchEditImpact = async (purchaseId: string) => {
    const { data, error } = await supabase.rpc('card_purchase_edit_impact' as any, { _purchase_id: purchaseId });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return {
      lockedCount: Number(row?.locked_count ?? 0),
      lockedAmount: Number(row?.locked_amount ?? 0),
      futureCount: Number(row?.future_count ?? 0),
      futureAmount: Number(row?.future_amount ?? 0),
    };
  };

  return {
    cards: cardsQ.data ?? [],
    purchases: purchasesQ.data ?? [],
    installments: installmentsQ.data ?? [],
    isLoading: cardsQ.isLoading || purchasesQ.isLoading,
    createCard,
    updateCard,
    deleteCard,
    createPurchase,
    deletePurchase,
    updatePurchase,
    fetchEditImpact,
  };
};