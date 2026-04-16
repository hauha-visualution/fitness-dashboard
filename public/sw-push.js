// Service Worker cho PWA — Fitness App
// File này được đặt trong /public/ để vite-plugin-pwa merge với SW tự động

// ─── Push Notification Handler ──────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Thông báo mới', body: event.data.text() };
  }

  const { title = 'Fitness App', body = '', icon, badge, data } = payload;

  const options = {
    body,
    icon: icon || '/icons/icon-192.png',
    badge: badge || '/icons/badge-72.png',
    data: data || {},
    vibrate: [200, 100, 200],
    requireInteraction: false,
    silent: false,
    tag: data?.notificationId || 'fitness-notification',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification Click Handler ─────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Nếu app đã mở → focus vào
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICKED', data: event.notification.data });
          return;
        }
      }
      // Nếu chưa mở → mở tab mới
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
