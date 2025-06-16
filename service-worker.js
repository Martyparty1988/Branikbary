// Service worker pro offline přístup k aplikaci

const CACHE_NAME = 'bary-branik-v4';
const APP_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/data.js',
  './js/export.js',
  './js/history.js',
  './js/invoice.js',
  './js/settings.js',
  './js/settings_tab.js', // Nový soubor
  './js/stats.js',
  './js/theme.js',
  './js/ui.js',
  './js/utils.js',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Instalace service workeru
self.addEventListener('install', event => {
  console.log('Service Worker: Instalace');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Ukládání souborů do cache');
        return cache.addAll(APP_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Všechny soubory uloženy do cache');
        return self.skipWaiting();
      })
  );
});

// Aktivace service workeru
self.addEventListener('activate', event => {
  console.log('Service Worker: Aktivace');
  
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Mazání staré cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Aktivován a kontroluje požadavky');
      return self.clients.claim();
    })
  );
});

// Zpracování požadavků
self.addEventListener('fetch', event => {
  // Ignorování požadavků z jiných domén (CDN, Google Fonts atd.)
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('fonts.googleapis.com') && 
      !event.request.url.includes('cdn.jsdelivr.net')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - vrátit odpověď z cache
        if (response) {
          return response;
        }
        
        // Kopie požadavku, protože se jedná o stream, který může být použit pouze jednou
        const fetchRequest = event.request.clone();
        
        // Jinak vyslat požadavek na server
        return fetch(fetchRequest)
          .then(response => {
            // Vrátit odpověď, pokud není platná
            if (!response || response.status !== 200) {
              return response;
            }
            
            // Klonovat odpověď, protože se bude používat jak pro cache, tak pro prohlížeč
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                // Ukládáme pouze GET požadavky
                if (fetchRequest.method === 'GET') {
                  cache.put(event.request, responseToCache);
                }
              });
            
            return response;
          })
          .catch(error => {
            console.log('Service Worker: Chyba při načítání', error);
            // Pokud jde o HTML stránku, vrátit index.html z cache
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// Pro aktualizaci aplikace
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});