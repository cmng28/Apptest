// Generated from the complete production build. Journal data is never cached here.
const ROOT = new URL('./', self.location.href);
const PREFIX = 'still-app-' + encodeURIComponent(ROOT.href) + '-';
const CACHE = PREFIX + 'e4e779547a3a5d44';
const ASSETS = ["apple-touch-icon.png","assets/index-0kIby8Gc.css","assets/index-1frZN_JH.js","favicon.svg","icons/still-192.png","icons/still-512.png","icons/still-maskable-512.png","index.html","manifest.webmanifest"].map(file => new URL(file, ROOT).href);
const INDEX = new URL('index.html', ROOT).href;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(INDEX)).then(response => response || fetch(event.request)));
    return;
  }
  url.search = '';
  url.hash = '';
  if (ASSETS.includes(url.href)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(url.href)).then(response => response || fetch(event.request)));
  }
});
