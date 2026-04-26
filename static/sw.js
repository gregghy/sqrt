self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim());
});

self.addEventListener('push', e => {
    if (!e.data) return;

    try {
        const data = e.data.json();
        e.waitUntil(
            self.registration.showNotification(data.title, {
                body: data.body,
                icon: data.icon || '/favicon.svg',
                vibrate: [200, 100, 200],
                badge: '/favicon.svg'
            })
        );
    } catch (err) {
        console.error("SW Push Parsing Error:", err);
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    // We can focus the window here if needed, but for simple local notifications this is enough
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                let client = windowClients[i];
                if (client.url.includes('/') && 'focus' in client) {
                    return client.focus();
                }
            }
            // If none, open a new window
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
