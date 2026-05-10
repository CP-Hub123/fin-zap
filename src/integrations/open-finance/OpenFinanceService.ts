import { supabase } from '@/integrations/supabase/client';

export interface ConnectedAccountRow {
  id: string;
  user_id: string;
  pluggy_item_id: string;
  pluggy_account_id: string | null;
  bank_name: string | null;
  bank_logo: string | null;
  account_type: string | null;
  account_number: string | null;
  balance: number;
  status: string;
  last_sync: string | null;
}

/**
 * OpenFinanceService — integração Pluggy via Edge Functions seguras.
 * Todas chaves ficam no backend. Frontend recebe apenas connect tokens efêmeros.
 */
export const OpenFinanceService = {
  isAvailable() {
    return true;
  },

  async createConnectToken(itemId?: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('pluggy-connect-token', {
      body: itemId ? { itemId } : {},
    });
    if (error) throw error;
    if (!data?.accessToken) throw new Error('Token inválido');
    return data.accessToken as string;
  },

  async syncItem(itemId: string): Promise<{ imported: number; accounts: number }> {
    const { data, error } = await supabase.functions.invoke('pluggy-sync', {
      body: { itemId },
    });
    if (error) throw error;
    return { imported: data?.imported ?? 0, accounts: data?.accounts ?? 0 };
  },

  async listConnectedAccounts(userId: string): Promise<ConnectedAccountRow[]> {
    const { data, error } = await supabase
      .from('connected_accounts' as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as ConnectedAccountRow[];
  },

  async disconnect(accountId: string): Promise<void> {
    const { error } = await supabase.from('connected_accounts' as any).delete().eq('id', accountId);
    if (error) throw error;
  },
};
