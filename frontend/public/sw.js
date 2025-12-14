self.addEventListener('push', (event) => {
  let data = { title: 'Bus Update', body: 'New location details received', url: '/' };

  if (event.data) {
    try {
      const json = event.data.json();
      data = { ...data, ...json };
    } catch (e) {
      console.warn('Push parse error:', e);
      try {
        data.body = event.data.text();
      } catch (textErr) {
        // quiet fail
      }
    }
  }

  const options = {
    body: data.body,
    icon: '/markers/bus.png',
    badge: '/markers/location.png',
    data: {
      url: data.url
    },
    // Adding tag allows coalescing multiple rapid updates into one
    tag: data.tag || 'trackmate-update',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
