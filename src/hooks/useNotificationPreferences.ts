import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type NotificationPreferences = {
  user_id: string;
  cartoes: boolean;
  saldo_orcamento: boolean;
  vencimentos: boolean;
  recorrencias: boolean;
  metas_cofrinhos: boolean;
  insights: boolean;
  alertas_criticos: boolean;
  sistema_novidades: boolean;
  lembrete_diario: boolean;
  resumo_semanal: boolean;
  quiet_hours_start: number;
  quiet_hours_end: number;
  timezone: string;
};

const DEFAULTS: Omit<NotificationPreferences, 'user_id'> = {
  cartoes: true,
  saldo_orcamento: true,
  vencimentos: true,
  recorrencias: true,
  metas_cofrinhos: true,
  insights: true,
  alertas_criticos: true,
  sistema_novidades: true,
  lembrete_diario: false,
  resumo_semanal: true,
  quiet_hours_start: 22,
  quiet_hours_end: 7,
  timezone: 'America/Sao_Paulo',
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['notification_preferences', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (data) return data as NotificationPreferences;
      const seed = { user_id: user!.id, ...DEFAULTS };
      await supabase.from('notification_preferences').upsert(seed);
      return seed as NotificationPreferences;
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<NotificationPreferences>) => {
      if (!user) throw new Error('not authenticated');
      const { error } = await supabase
        .from('notification_preferences')
        .update(patch)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification_preferences', user?.id] }),
  });

  return { prefs: query.data, isLoading: query.isLoading, update };
}