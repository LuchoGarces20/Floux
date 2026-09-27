const CACHE_NAME = 'floux-cache-v1.13'; 
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './js/main.js',
    './js/store.js',
    './js/ui.js',
    './js/financeEngine.js',
    './js/flouxVision.js', 
    './js/flouxVault.js',
    './js/i18n.js',
    './js/categories.js',
    './js/swipeHandler.js',
    './img/logo-floux.svg',
    './img/logo-light.svg',
    './img/logo-dark.svg',
    './img/logo180.png',
    './img/logo512.png',
    './img/sc-icone-add.svg',
    './img/sc-icone-sim.svg'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then(response => {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close(); // Fecha a notificação do sistema
    
    // A URL que queremos abrir (com o parâmetro action para acionar o modal)
    const urlToOpen = new URL('./?action=add-expense', self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            // Se o app já estiver aberto em alguma aba, foca nela e redireciona
            for (let client of windowClients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(urlToOpen);
                    return client.focus();
                }
            }
            // Se o app estiver fechado, abre uma nova janela/aba
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});