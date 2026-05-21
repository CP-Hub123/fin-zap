import { supabase } from '@/integrations/supabase/client';

export type NotificationType =
  | 'budget_50'
  | 'budget_80'
  | 'budget_100'
  | 'subscription_due'
  | 'invisible_spending'
  | 'general';

interface NotificationTemplate {
  title: string;
  body: string;
}

const templates: Record<NotificationType, (data?: Record<string, any>) => NotificationTemplate> = {
  budget_50: () => ({
    title: '50% do orçamento utilizado',
    body: 'Você já utilizou metade do seu orçamento mensal. Fique atento aos próximos gastos!',
  }),
  budget_80: () => ({
    title: '80% do orçamento utilizado',
    body: 'Atenção: você já utilizou 80% do seu orçamento. Considere reduzir os gastos restantes.',
  }),
  budget_100: () => ({
    title: '🚨 Limite de orçamento atingido',
    body: 'Seu orçamento mensal foi totalmente utilizado. Qualquer novo gasto será acima do planejado.',
  }),
  subscription_due: (data) => ({
    title: '📅 Assinatura próxima do vencimento',
    body: data?.days
      ? `Sua assinatura vence em ${data.days} dia(s). Renove para manter o acesso.`
      : 'Sua assinatura está próxima do vencimento.',
  }),
  invisible_spending: (data) => ({
    title: '👻 Gastos invisíveis detectados',
    body: data?.total
      ? `Você tem R$ ${Number(data.total).toFixed(2)} em pequenos gastos recorrentes que podem estar impactando seu saldo.`
      : 'Você pode estar tendo gastos invisíveis que impactam seu saldo.',
  }),
  general: (data) => ({
    title: data?.title || 'FinZap',
    body: data?.body || 'Você tem uma nova notificação.',
  }),
};

/**
 * Central function: creates a notification in the database and optionally sends push.
 * Deduplicates by checking if the same type was sent in the last hour.
 */
const TYPE_TO_CATEGORY: Record<NotificationType, string> = {
  budget_50: 'insight',
  budget_80: 'alerta',
  budget_100: 'alerta',
  subscription_due: 'vencimento',
  invisible_spending: 'insight',
  general: 'general',
};

const TYPE_TO_PRIORITY: Record<NotificationType, 'low' | 'normal' | 'high' | 'critical'> = {
  budget_50: 'normal',
  budget_80: 'high',
  budget_100: 'critical',
  subscription_due: 'high',
  invisible_spending: 'normal',
  general: 'normal',
};

export async function createNotification(
  userId: string,
  type: NotificationType,
  data?: Record<string, any>,
  sendPush = true,
  options?: { dedupe_key?: string; action_url?: string }
): Promise<boolean> {
  const template = templates[type](data);
  const category = TYPE_TO_CATEGORY[type];
  const priority = TYPE_TO_PRIORITY[type];
  const dedupe_key = options?.dedupe_key;

  // Backend dedupe + log handled by send-push when used; for direct insert we still dedupe locally.
  if (sendPush) {
    try {
      await supabase.functions.invoke('send-push', {
        body: {
          user_id: userId,
          title: template.title,
          body: template.body,
          type,
          category,
          priority,
          url: options?.action_url,
          dedupe_key,
        },
      });
      return true;
    } catch (e) {
      console.warn('Push send failed:', e);
    }
  }

  // Fallback: direct log insert with dedupe
  if (dedupe_key) {
    const { data: existing } = await supabase
      .from('notifications_log')
      .select('id')
      .eq('user_id', userId)
      .eq('dedupe_key', dedupe_key)
      .limit(1);
    if (existing && existing.length > 0) return false;
  }
  const { error } = await supabase.from('notifications_log').insert({
    user_id: userId,
    type,
    title: template.title,
    message: template.body,
    category,
    priority,
    dedupe_key: dedupe_key ?? null,
    action_url: options?.action_url ?? null,
  });
  return !error;
}
