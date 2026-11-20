// ZonePlanner service worker: precaches the files the page loads and serves
// them cache-first, so the app works offline once loaded. VERSION and PRECACHE
// are stamped by `npm run sw:stamp`; never edit those two lines by hand.
const VERSION = "6e2b074e579b0bae";
const PRECACHE = ["app.js","assets/fonts/hanken-grotesk-latin-ext.woff2","assets/fonts/hanken-grotesk-latin.woff2","assets/fonts/libre-baskerville-latin-ext.woff2","assets/fonts/libre-baskerville-latin.woff2","index.html","js/cities.js","js/filter.js","js/reorder.js","js/scroll.js","js/search.js","js/state.js","js/strings.js","js/time.js","js/zones.js","styles.css"];

// Caches are named per installation (scope) and version, so two copies of the
// app on one origin never delete each other's caches.
const PREFIX = "zoneplanner:" + self.registration.scope + ":";
const CACHE = PREFIX + VERSION;
const SCOPE_PATH = new URL(self.registration.scope).pathname;

// A new version never takes over early: it waits until every page using the old one has closed.
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" })))));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key)))));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    // Only the app's own page (share links included) gets the cached index.html.
    if (url.pathname !== SCOPE_PATH && url.pathname !== SCOPE_PATH + "index.html") return;
    event.respondWith(caches.open(CACHE).then((cache) => cache.match("index.html")).then((hit) => hit || fetch(request)));
    return;
  }
  event.respondWith(caches.open(CACHE).then((cache) => cache.match(request)).then((hit) => hit || fetch(request)));
});
