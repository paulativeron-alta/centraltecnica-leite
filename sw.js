/* Guarda as telas para abrir mais rápido; os dados sempre vêm do servidor. */
const VERSAO = 'leite-v1';
const TELAS = ['./', 'index.html', 'config.js', 'core/alta.js', 'core/plataforma.css', 'central/', 'crm/', 'icones/icone.svg', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(TELAS)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // primeiro a rede (para pegar atualizações); sem internet, a cópia guardada
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSAO).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
