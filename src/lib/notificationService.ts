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
    title: '⚠️ 50% do orçamento utilizado',
    body: 'Você já utilizou metade do seu orçamento mensal. Fique atento aos próximos gastos!',
  }),
  budget_80: () => ({
    title: '🔴 80% do orçamento utilizado',
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
export async function createNotification(
  userId: string,
  type: NotificationType,
  data?: Record<string, any>,
  sendPush = true
): Promise<boolean> {
  const template = templates[type](data);

  // Dedup: check if same type sent in last hour
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { data: recent } = await supabase
    .from('notifications_log')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .gte('sent_at', oneHourAgo)
    .limit(1);

  if (recent && recent.length > 0) return false; // Already sent recently

  // Save to database
  const { error } = await supabase.from('notifications_log').insert({
    user_id: userId,
    type,
    title: template.title,
    message: template.body,
  });

  if (error) {
    console.error('Failed to create notification:', error);
    return false;
  }

  // Try sending push (fire-and-forget, never blocks)
  if (sendPush) {
    try {
      await supabase.functions.invoke('send-push', {
        body: { user_id: userId, title: template.title, body: template.body, type },
      });
    } catch (e) {
      console.warn('Push send failed (non-blocking):', e);
    }
  }

  return true;
}
