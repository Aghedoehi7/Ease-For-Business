self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    const legacyCaches = cacheNames.filter((name) =>
      name.startsWith('workbox-precache-') ||
      ['start-url', 'pages', 'assets', 'google-fonts'].includes(name)
    );

    await Promise.all(legacyCaches.map((name) => caches.delete(name)));
    await self.registration.unregister();

    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    await Promise.all(clients.map((client) => client.navigate(client.url)));
  })());
});
