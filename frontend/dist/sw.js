const APP_PATH = '/student';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'notification-click', data: event.notification.data });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(APP_PATH);
      }
      return null;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'PING' && event.ports[0]) {
    event.ports[0].postMessage({ type: 'PONG' });
  }
});
