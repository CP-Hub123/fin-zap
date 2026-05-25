import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const VAPID_PUBLIC_KEY = 'BFkJUOVv4zqJ66952R07dAL9LFzYfunNlPnOvTzN8jVd5c0ZWOWkNn4fcpL3Zca_BO3f1rFJXDAvzEdNr2wf3z0';

const VALID_HOST = /\.(googleapis\.com|mozilla\.com|windows\.com|apple\.com|push\.services)/i;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

function uint8ArrayToBase64Url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return window.btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function subscriptionVapidKey(sub: PushSubscription) {
  const key = sub.options?.applicationServerKey;
  if (!key) return null;
  const bytes = key instanceof ArrayBuffer
    ? new Uint8Array(key)
    : new Uint8Array(key.buffer, key.byteOffset, key.byteLength);
  return uint8ArrayToBase64Url(bytes);
}

function usesCurrentVapidKey(sub: PushSubscription) {
  const key = subscriptionVapidKey(sub);
  return !key || key === VAPID_PUBLIC_KEY;
}

function isValidEndpoint(endpoint?: string | null) {
  if (!endpoint || endpoint.includes('permanently-removed.invalid')) return false;
  try {
    const u = new URL(endpoint);
    if (u.protocol !== 'https:') return false;
    return VALID_HOST.test(u.hostname) || u.hostname.includes('push');
  } catch { return false; }
}

function deviceInfo() {
  const ua = navigator.userAgent;
  const platform = /iPad|iPhone|iPod/.test(ua) ? 'iOS' :
                   /Android/.test(ua) ? 'Android' :
                   /Windows/.test(ua) ? 'Windows' :
                   /Mac OS/.test(ua) ? 'macOS' :
                   /Linux/.test(ua) ? 'Linux' : 'Unknown';
  return {
    platform,
    language: navigator.language,
    push_provider: 'web-push',
    vapid_public_key: VAPID_PUBLIC_KEY,
  };
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const supported = typeof window !== 'undefined' &&
    'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined';
  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : 'default'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const subscribingRef = useRef(false);

  const persist = useCallback(async (sub: PushSubscription) => {
    if (!user) return;
    const json = sub.toJSON();
    if (!isValidEndpoint(json.endpoint) || !json.keys?.p256dh || !json.keys?.auth) {
      await sub.unsubscribe().catch(() => undefined);
      throw new Error('Invalid push subscription');
    }
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .like('endpoint', '%permanently-removed.invalid%');

    await supabase.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint: json.endpoint!,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        device_info: deviceInfo(),
        user_agent: navigator.userAgent,
        last_seen_at: new Date().toISOString(),
        failure_count: 0,
      },
      { onConflict: 'endpoint' }
    );
    setIsSubscribed(true);
  }, [user]);

  const subscribeInternal = useCallback(async () => {
    if (!user || !supported || subscribingRef.current) return false;
    subscribingRef.current = true;
    try {
      const result = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') { setIsSubscribed(false); return false; }

      await navigator.serviceWorker.register('/sw.js');
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      const existing = sub?.toJSON();
      const bad = !sub ||
        !isValidEndpoint(existing?.endpoint) ||
        !existing?.keys?.p256dh ||
        !existing?.keys?.auth;
      if (sub && bad) {
        await sub.unsubscribe().catch(() => undefined);
        sub = null;
      }
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      await persist(sub);
      return true;
    } catch (err) {
      console.error('Push subscription failed:', err);
      setIsSubscribed(false);
      return false;
    } finally {
      subscribingRef.current = false;
    }
  }, [user, supported, persist]);

  // Public: explicit user-driven request
  const subscribe = useCallback(() => subscribeInternal(), [subscribeInternal]);

  // On mount: if already granted, refresh subscription quietly.
  useEffect(() => {
    if (!user || !supported) return;
    setPermission(Notification.permission);
    if (Notification.permission === 'granted') {
      subscribeInternal();
    } else {
      setIsSubscribed(false);
    }
  }, [user, supported, subscribeInternal]);

  // Listen for SW messages (subscription changed, click tracking)
  useEffect(() => {
    if (!supported) return;
    const handler = async (e: MessageEvent) => {
      const data = e.data || {};
      if (data.type === 'pushsubscriptionchange') {
        await subscribeInternal();
      } else if (data.type === 'notification-clicked' && data.id) {
        await supabase
          .from('notifications_log')
          .update({ clicked_at: new Date().toISOString(), read: true })
          .eq('id', data.id);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [supported, subscribeInternal]);

  return { permission, isSubscribed, supported, subscribe };
};