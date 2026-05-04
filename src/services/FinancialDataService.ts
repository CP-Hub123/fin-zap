import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Transaction = Tables<'transactions'>;

/**
 * FinancialDataService — camada única de acesso a dados financeiros.
 *
 * Toda lógica de cálculo do sistema DEVE consumir esta camada,
 * nunca acessar `supabase.from('transactions')` diretamente.
 *
 * Preparado para futuras transações externas (Open Finance) sem
 * acoplar o resto do app a nenhum provedor.
 */
export const FinancialDataService = {
  /** Retorna todas transações do usuário (manual + externas no futuro). */
  async getAllTransactions(userId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data as Transaction[];
  },

  /** Retorna transações de um mês específico. */
  async getTransactionsByMonth(monthId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('month_id', monthId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data as Transaction[];
  },

  /** Cria transação manual (sempre source = 'manual'). */
  async createManualTransaction(
    data: Omit<TablesInsert<'transactions'>, 'source' | 'external_id' | 'provider' | 'sync_status'>,
  ): Promise<Transaction> {
    const payload: TablesInsert<'transactions'> = {
      ...data,
      source: 'manual',
      external_id: null,
      provider: null,
      sync_status: null,
    };
    const { data: result, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return result as Transaction;
  },

  /** Sincronização externa (Open Finance) — ainda não implementada. */
  async syncExternalTransactions(_userId: string): Promise<never> {
    throw new Error('Not implemented: Open Finance sync ainda não está disponível.');
  },
};
