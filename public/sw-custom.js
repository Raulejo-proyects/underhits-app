// Custom service worker additions - injected alongside next-pwa generated sw.js
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || "UNDER Hits Radio", {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-96.png",
    vibrate: [200, 100, 200],
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/radio"));
});
