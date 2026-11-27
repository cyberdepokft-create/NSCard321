/* NS Card – service worker: gyorsabb betöltés és telepíthető alkalmazás.
 * Oldalak: hálózat elsőként (mindig a friss verzió), offline esetén a mentett példány.
 * Verziózott fájlok és képek: gyorsítótárból, háttérben frissítve. Az admin, az API és a katalógus kimarad. */
const VERSION = "nsc-5.1.1";
const PAGES = `${VERSION}-pages`;
const STATIC = `${VERSION}-static`;

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(PAGES).then(c => c.addAll(["/", "/products"]).catch(() => {})));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

const skip = url => /^\/(admin|api\/|feeds\/)/.test(url.pathname) || /\/(store\/catalog\.json|sync-config\.json|sitemap\.xml|sw\.js)$/.test(url.pathname);

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || skip(url)) return;

  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) { const c = await caches.open(PAGES); c.put(req, res.clone()); }
        return res;
      } catch {
        return (await caches.match(req, { ignoreSearch: false })) || (await caches.match(url.pathname)) || (await caches.match("/")) || Response.error();
      }
    })());
    return;
  }

  if (/^\/(assets|img)\//.test(url.pathname) || /\.(png|ico|webp|jpg|svg|woff2?)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const c = await caches.open(STATIC);
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })());
  }
});
