// Giglet service worker: network-first, so updates always show; cached copy only when offline.
const V="giglet-v7";
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{const r=e.request,u=new URL(r.url);
  if(r.method!=="GET"||u.origin!==location.origin||u.pathname.startsWith("/api/"))return;
  e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(V).then(ch=>ch.put(r,c))}return res}).catch(()=>caches.match(r).then(m=>m||caches.match("/"))))});
