/* MARF PWA service worker. Network-first pages; cache only same-origin shell/assets. */
const CACHE="marf-pakistan-pwa-v1";
const SHELL=["/","/manifest.webmanifest","/favicon.svg"];
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("marf-pwa-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
 const request=event.request;
 if(request.method!=="GET")return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 if(/\/(admin|account|checkout|api|auth)(\/|$)/i.test(url.pathname))return;
 if(request.mode==="navigate"){
  event.respondWith(fetch(request).then(response=>{
   if(response.ok&&url.pathname==="/"){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put("/",copy));}
   return response;
  }).catch(()=>caches.match("/").then(cached=>cached||Response.error())));
  return;
 }
 event.respondWith(caches.match(request).then(cached=>{
  if(cached)return cached;
  return fetch(request).then(response=>{
   if(response.ok&&response.type==="basic"){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}
   return response;
  });
 }));
});
