import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const VAPID_PUBLIC_KEY = 'BFkJUOVv4zqJ66952R07dAL9LFzYfunNlPnOvTzN8jVd5c0ZWOWkNn4fcpL3Zca_BO3f1rFJXDAvzEdNr2wf3z0';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function isValidPushEndpoint(endpoint?: string | null) {
  if (!endpoint || endpoint.includes('permanently-removed.invalid')) return false;

  try {
    return new URL(endpoint).protocol === 'https:';
  } catch {
    return false;
  }
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);

  const subscribe = useCallback(async () => {
    if (!user || typeof Notification === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
      const result = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();

      setPermission(result);
      if (result !== 'granted') {
        setIsSubscribed(false);
        return;
      }

      await navigator.serviceWorker.register('/sw.js');
      const registration = await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      const existingJson = subscription?.toJSON();
      const shouldRecreate =
        !subscription ||
        !isValidPushEndpoint(existingJson?.endpoint) ||
        !existingJson?.keys?.p256dh ||
        !existingJson?.keys?.auth;

      if (subscription && shouldRecreate) {
        console.warn('Invalid push subscription detected, recreating', {
          endpoint: existingJson?.endpoint ?? null,
        });
        await subscription.unsubscribe().catch(() => undefined);
        subscription = null;
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const subJson = subscription.toJSON();
      if (!isValidPushEndpoint(subJson.endpoint) || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        await subscription.unsubscribe().catch(() => undefined);
        throw new Error(`Invalid push subscription endpoint: ${subJson.endpoint ?? 'missing'}`);
      }

      console.info('Push subscription ready', { endpoint: subJson.endpoint });

      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .like('endpoint', '%permanently-removed.invalid%');

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        },
        { onConflict: 'user_id,endpoint' }
      );

      if (error) throw error;
      setIsSubscribed(true);
    } catch (err) {
      console.error('Push subscription failed:', err);
      setIsSubscribed(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || typeof Notification === 'undefined') return;

    setPermission(Notification.permission);

    if (Notification.permission === 'granted') {
      subscribe();
    } else {
      setIsSubscribed(false);
    }
  }, [user, subscribe]);

  return { permission, isSubscribed, subscribe };
};
