/* FinZap Service Worker — Web Push */
const SW_VERSION = 'finzap-sw-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('push', (event) => {
  let payload = { title: 'FinZap', body: 'Você tem uma nova notificação', url: '/app' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (e) {
    try { payload.body = event.data?.text() || payload.body; } catch (_) {}
  }

  const isCritical = payload.priority === 'critical';
  const tag = payload.tag || payload.dedupe_key || payload.type || 'finzap';

  const options = {
    body: payload.body,
    icon: '/logo.png',
    badge: '/logo.png',
    tag,
    renotify: true,
    requireInteraction: !!isCritical,
    silent: false,
    data: {
      url: payload.url || '/app',
      notification_id: payload.notification_id || null,
      type: payload.type || 'general',
    },
    actions: payload.actions || [
      { action: 'open', title: 'Abrir' },
    ],
  };

  event.waitUntil(self.registration.showNotification(payload.title || 'FinZap', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/app';
  const notificationId = event.notification.data?.notification_id;

  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const origin = self.location.origin;

    // Tell any open client to mark as clicked
    if (notificationId) {
      for (const c of all) {
        c.postMessage({ type: 'notification-clicked', id: notificationId });
      }
    }

    for (const c of all) {
      if (c.url.startsWith(origin) && 'focus' in c) {
        try {
          await c.navigate(targetUrl).catch(() => undefined);
        } catch (_) {}
        return c.focus();
      }
    }
    return self.clients.openWindow(targetUrl);
  })());
});

self.addEventListener('pushsubscriptionchange', (event) => {
  // Notify clients to recreate subscription on next visit
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) c.postMessage({ type: 'pushsubscriptionchange' });
  })());
});