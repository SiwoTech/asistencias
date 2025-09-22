// Service Worker para CWO TimeTrack PWA
const CACHE_NAME = 'cwo-timetrack-v1.0.0';
const OFFLINE_URL = '/asistencias/offline.html';

// Archivos esenciales para cachear
const STATIC_RESOURCES = [
  '/asistencias/',
  '/asistencias/index.html',
  '/asistencias/css/style.css',
  '/asistencias/css/responsive.css',
  '/asistencias/js/main.js',
  '/asistencias/js/empleados.js',
  '/asistencias/js/asistencia.js',
  '/asistencias/js/horarios-fix.js',
  '/asistencias/manifest.json',
  '/asistencias/assets/icons/icon-192x192.png',
  '/asistencias/assets/icons/icon-512x512.png',
  OFFLINE_URL
];

// URLs de la API que se pueden cachear
const API_CACHE_PATTERNS = [
  /\/asistencias\/php\/api\/empleados\.php/,
  /\/asistencias\/php\/api\/departamentos\.php/,
  /\/asistencias\/php\/api\/horarios\.php/
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando recursos estáticos...');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        console.log('[SW] Service Worker instalado correctamente');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Error durante la instalación:', error);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
  console.log('[SW] Activando Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activado');
        return self.clients.claim();
      })
  );
});

// Interceptar peticiones de red
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Solo manejar peticiones del mismo origen
  if (url.origin !== location.origin) {
    return;
  }
  
  // Estrategia Network First para la API
  if (isApiRequest(request)) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }
  
  // Estrategia Cache First para recursos estáticos
  if (isStaticResource(request)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }
  
  // Estrategia Network First para navegación
  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request));
    return;
  }
  
  // Para todo lo demás, intentar red primero
  event.respondWith(networkFirstStrategy(request));
});

// Verificar si es una petición a la API
function isApiRequest(request) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(request.url));
}

// Verificar si es un recurso estático
function isStaticResource(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|webp)$/);
}

// Estrategia Cache First (para recursos estáticos)
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    // ✅ Solo cachear si es GET
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Error en cache first:', error);
    return new Response('Recurso no disponible offline', { status: 503 });
  }
}

// Estrategia Network First (para API y contenido dinámico)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    // ✅ Solo cachear si es GET
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, intentando cache...');
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si es una petición de API, devolver datos por defecto
    if (isApiRequest(request)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Sin conexión a internet',
        offline: true,
        data: []
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Contenido no disponible offline', { status: 503 });
  }
}

// Estrategia para navegación
async function navigationStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('[SW] Navigation offline, cargando página offline...');
    
    const cachedResponse = await caches.match(OFFLINE_URL);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sin conexión - CWO TimeTrack</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px;
              background: #f5f5f5;
            }
            .offline-container {
              background: white;
              padding: 40px;
              border-radius: 10px;
              max-width: 400px;
              margin: 0 auto;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .offline-icon {
              font-size: 64px;
              color: #e74c3c;
              margin-bottom: 20px;
            }
            h1 { color: #333; margin-bottom: 20px; }
            p { color: #666; margin-bottom: 30px; }
            button {
              background: #e74c3c;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 5px;
              cursor: pointer;
              font-size: 16px;
            }
            button:hover { background: #c0392b; }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="offline-icon">📱</div>
            <h1>Sin conexión a internet</h1>
            <p>No hay conexión disponible. Algunas funciones pueden estar limitadas en modo offline.</p>
            <button onclick="window.location.reload()">Reintentar</button>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Mensajes desde la aplicación principal
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker registrado');