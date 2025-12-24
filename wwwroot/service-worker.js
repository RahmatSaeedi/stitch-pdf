// PDF Merger Service Worker for PWA
const CACHE_NAME = 'pdf-merger-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/app.css',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/_framework/blazor.webassembly.js',
    '/_content/MudBlazor/MudBlazor.min.css',
    '/_content/MudBlazor/MudBlazor.min.js',
    '/lib/pdf-lib.min.js',
    '/lib/pdf.min.js',
    '/lib/pdf.worker.min.js',
    '/lib/heic2any.min.js',
    '/lib/jszip.min.js',
    '/lib/Sortable.min.js',
    '/lib/marked.min.js',
    '/lib/papaparse.min.js',
    '/lib/html2canvas.min.js',
    '/lib/UTIF.js',
    '/lib/mammoth.browser.min.js',
    '/lib/xlsx.full.min.js',
    '/lib/tesseract.min.js',
    '/lib/signature_pad.umd.min.js',
    '/lib/qrcode.min.js',
    '/lib/jsbarcode.all.min.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching app shell');
                return cache.addAll(urlsToCache.map(url => new Request(url, { cache: 'reload' })))
                    .catch(err => {
                        console.error('[Service Worker] Cache addAll error:', err);
                        // Continue even if some resources fail to cache
                        return Promise.resolve();
                    });
            })
            .then(() => {
                console.log('[Service Worker] Skip waiting');
                return self.skipWaiting();
            })
    );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[Service Worker] Claiming clients');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip chrome extension requests
    if (event.request.url.startsWith('chrome-extension://')) {
        return;
    }

    // Skip Blazor hot reload
    if (event.request.url.includes('_framework/aspnetcore-browser-refresh')) {
        return event.respondWith(fetch(event.request));
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                if (response) {
                    console.log('[Service Worker] Serving from cache:', event.request.url);
                    return response;
                }

                return fetch(event.request).then(fetchResponse => {
                    // Don't cache non-successful responses
                    if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                        return fetchResponse;
                    }

                    // Cache CDN resources (Tesseract, signature_pad, etc.)
                    if (event.request.url.includes('cdn.jsdelivr.net')) {
                        const responseToCache = fetchResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }

                    return fetchResponse;
                }).catch(err => {
                    console.error('[Service Worker] Fetch failed:', err);

                    // For Tesseract language files, provide informative error
                    if (event.request.url.includes('tessdata')) {
                        return new Response('OCR language file unavailable offline', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    }

                    // Return offline message for other resources
                    return new Response('Offline - Please check your connection', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({
                            'Content-Type': 'text/plain'
                        })
                    });
                });
            })
    );
});

// Background sync for future features
self.addEventListener('sync', event => {
    console.log('[Service Worker] Background sync:', event.tag);
    // Can be used for offline PDF processing queue
});

// Push notifications (if needed in future)
self.addEventListener('push', event => {
    console.log('[Service Worker] Push notification received');
    // Can be used for processing completion notifications
});
