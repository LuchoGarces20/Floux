const CACHE_NAME = 'floux-cache-v1.21';
const ASSETS_TO_CACHE = [
    './', './index.html', './manifest.json', './css/style.css',
    './js/main.js', './js/store.js', './js/ui.js', './js/financeEngine.js',
    './js/flouxVision.js', './js/flouxVault.js', './js/i18n.js',
    './js/categories.js', './js/swipeHandler.js', './js/supabaseClient.js',
    './js/confirmedActions.js', './js/creationDrafts.js',
    './img/logo-floux.svg', './img/logo-light.svg', './img/logo-dark.svg',
    './img/logo180.png', './img/logo512.png', './img/sc-icone-add.svg', './img/sc-icone-sim.svg'
];
const scopeURL = new URL('./', self.registration.scope);
const publicAssetURLs = new Set(ASSETS_TO_CACHE.map(path => new URL(path, scopeURL).href));

self.addEventListener('install', event => {
    // Aguarda abas antigas fecharem; evita recarregar formulário durante atualização.
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)));
});
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        for (const name of await caches.keys()) {
            if (name.startsWith('floux-cache-') && name !== CACHE_NAME) await caches.delete(name);
        }
        await self.clients.claim();
    })());
});

function cacheableURL(request) {
    if (request.method !== 'GET') return null;
    const url = new URL(request.url);
    if (url.origin !== scopeURL.origin) return null;
    // Somente a página pública pode ignorar parâmetros de navegação/atalho.
    if (request.mode === 'navigate' && (url.pathname === scopeURL.pathname || url.pathname === new URL('index.html', scopeURL).pathname)) {
        return new URL('index.html', scopeURL).href;
    }
    if (url.search || !publicAssetURLs.has(url.href)) return null;
    return url.href;
}
self.addEventListener('fetch', event => {
    const url = cacheableURL(event.request);
    if (!url) return; // API, Auth e SDK externo não passam pelo cache do app.
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(url);
        if (cached) return cached;
        try {
            const response = await fetch(event.request);
            if (response.ok && response.type !== 'opaque') await cache.put(url, response.clone());
            return response;
        } catch {
            return new Response('Sem conexão para carregar este arquivo. Reconecte e tente novamente.', {
                status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
        }
    })());
});
self.addEventListener('notificationclick', event => {
    event.notification.close();
    const urlToOpen = new URL('?action=add-expense', scopeURL).href;
    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const client = windows.find(item => item.url.startsWith(scopeURL.href) && 'focus' in item);
        if (client) { await client.navigate(urlToOpen); return client.focus(); }
        return self.clients.openWindow(urlToOpen);
    })());
});