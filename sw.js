// Service Worker

// Version
const version = '1.0';

// Static Cache - App Shell
const assets = [
  'index.html',
  'main.js',
  'images/flame.png',
  'images/logo.png',
  'images/sync.png',
  'vendor/bootstrap.min.css',
  'vendor/jquery.min.js'
];

// Install
self.addEventListener('install', event => {

  event.waitUntil(
    caches.open(`static-${version}`)
      .then(cache => cache.addAll(assets))
  );
});

// Activate
self.addEventListener('activate', event => {

  // Clean static cache
  let cleaned = caches.keys().then(keys => {
    keys.forEach(key => {
      if (key !== `static-${version}` && key.match('static-')) {
        return caches.delete(key);
      }
    })
  });

  event.waitUntil(cleaned);
});

// Static cache strategy - Cache with Network Fallback
const staticCache = (request, cacheName = `static-${version}`) => {
  
  return caches.match(request).then(cachedResult => {
    if (cachedResult) return cachedResult;
    
    // Network fallback
    return fetch(request).then(networkResult => {

      // Update cache with new response
      caches.open(cacheName)
        .then(cache => cache.put(request, networkResult));

      return networkResult.clone();
    });
  });
};

// Network with Cache Fallback
const fallbackCache = request => {

  // Try the Network
  return fetch(request)
    .then(networkResult => {

      // Check result is OK, else fallback to cache
      if (!networkResult.ok) throw 'Fetch Error';

      // Update cache with new response
      caches.open(`static-${version}`)
        .then(cache => cache.put(request, networkResult));

      // Return clone of network response
      return networkResult.clone();

    })
    // Try cache if network fails
    .catch(error => caches.match(request));
};

// Clean old Giphys from the giphy cache
const cleanGiphyCache = giphys => {

  caches.open('giphy').then(cache => {
    // Get all cache entries
    cache.keys().then(keys => {

      keys.forEach(key => {

        // If entry is not apart of current Giphy, delete
        if(!giphys.includes(key.url)) cache.delete(key);
      });
    });
  });
};


// Fetch
self.addEventListener('fetch', event => {

  // App Shell
  if (event.request.url.match(location.origin)) {

    event.respondWith(staticCache(event.request));

  // Giphy API    
  } else if (event.request.url.match('api.giphy.com/v1/gifs/trending')) {

    event.respondWith(fallbackCache(event.request));

  // Giphy Media
  } else if (event.request.url.match('giphy.com/media')) {
    event.respondWith(staticCache(event.request, 'giphy'));
  }
});

// Listen to message from client
self.addEventListener('message', event => {

  // Identify the message
  if(event.data.action === 'cleanGiphyCache') cleanGiphyCache(event.data.giphys);
});