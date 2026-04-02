import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'trial' | 'premium';
  status: 'active' | 'expired';
  starts_at: string;
  expires_at: string | null;
  is_manual: boolean;
  discount_tag: string | null;
  created_at: string;
  updated_at: string;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;

      // Fallback: create trial if not found
      if (!data) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 3);
        const { data: newSub, error: insertErr } = await supabase
          .from('subscriptions')
          .insert({
            user_id: user!.id,
            plan: 'trial' as any,
            status: 'active' as any,
            expires_at: expiresAt.toISOString(),
          })
          .select()
          .single();
        if (insertErr) throw insertErr;
        return newSub as unknown as Subscription;
      }

      // Auto-expire if past date
      if (data.expires_at && new Date(data.expires_at) < new Date() && data.status === 'active') {
        await supabase
          .from('subscriptions')
          .update({ status: 'expired' })
          .eq('id', data.id);
        return { ...data, status: 'expired' } as unknown as Subscription;
      }

      return data as unknown as Subscription;
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const subscription = query.data ?? null;
  const isActive = subscription?.status === 'active';
  const isTrial = subscription?.plan === 'trial';
  const isExpired = subscription?.status === 'expired';
  const canAct = isActive; // can create/edit/delete transactions

  const daysLeft = subscription?.expires_at
    ? Math.max(0, Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['subscription'] });

  return {
    subscription,
    isLoading: query.isLoading,
    isActive,
    isTrial,
    isExpired,
    canAct,
    daysLeft,
    refresh,
  };
};
