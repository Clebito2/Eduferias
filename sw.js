// ===== EDUFÉRIAS SERVICE WORKER =====

const CACHE_NAME = 'eduferias-v1.0.0';
const STATIC_CACHE_NAME = 'eduferias-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'eduferias-dynamic-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Comic+Neue:wght@400;700&display=swap'
];

// Dynamic content patterns
const DYNAMIC_PATTERNS = [
    /^https:\/\/api\.openweathermap\.org/,
    /^https:\/\/fonts\.gstatic\.com/
];

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('[SW] Static files cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Error caching static files:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE_NAME && 
                            cacheName !== DYNAMIC_CACHE_NAME &&
                            cacheName.startsWith('eduferias-')) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Service worker activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Handle different types of requests
    if (isStaticFile(request.url)) {
        event.respondWith(handleStaticFile(request));
    } else if (isDynamicContent(request.url)) {
        event.respondWith(handleDynamicContent(request));
    } else {
        event.respondWith(handleOtherRequests(request));
    }
});

// Check if URL is a static file
function isStaticFile(url) {
    return STATIC_FILES.some(file => url.includes(file)) ||
           url.includes('.css') ||
           url.includes('.js') ||
           url.includes('.html') ||
           url.includes('fonts.googleapis.com');
}

// Check if URL is dynamic content
function isDynamicContent(url) {
    return DYNAMIC_PATTERNS.some(pattern => pattern.test(url));
}

// Handle static files - cache first strategy
async function handleStaticFile(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log('[SW] Serving from cache:', request.url);
            return cachedResponse;
        }
        
        console.log('[SW] Fetching and caching:', request.url);
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] Error handling static file:', error);
        
        // Return offline fallback for HTML requests
        if (request.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html');
        }
        
        throw error;
    }
}

// Handle dynamic content - network first strategy
async function handleDynamicContent(request) {
    try {
        console.log('[SW] Fetching dynamic content:', request.url);
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', request.url);
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return mock weather data if weather API fails
        if (request.url.includes('openweathermap.org')) {
            return new Response(JSON.stringify({
                weather: [{ main: 'Clear', description: 'céu limpo' }],
                main: { temp: 25 }
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        throw error;
    }
}

// Handle other requests
async function handleOtherRequests(request) {
    try {
        return await fetch(request);
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        throw error;
    }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync triggered:', event.tag);
    
    if (event.tag === 'activity-completion') {
        event.waitUntil(syncActivityCompletion());
    } else if (event.tag === 'activity-scheduling') {
        event.waitUntil(syncActivityScheduling());
    }
});

// Sync completed activities when back online
async function syncActivityCompletion() {
    try {
        console.log('[SW] Syncing completed activities...');
        
        // Get pending completions from IndexedDB or localStorage
        const pendingCompletions = JSON.parse(
            localStorage.getItem('pendingActivityCompletions') || '[]'
        );
        
        if (pendingCompletions.length > 0) {
            // In a real app, this would sync with a backend API
            console.log('[SW] Found pending completions:', pendingCompletions.length);
            
            // Clear pending completions
            localStorage.removeItem('pendingActivityCompletions');
            
            // Notify main thread
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'SYNC_COMPLETE',
                    data: { type: 'activity-completion', count: pendingCompletions.length }
                });
            });
        }
    } catch (error) {
        console.error('[SW] Error syncing activity completions:', error);
    }
}

// Sync scheduled activities when back online
async function syncActivityScheduling() {
    try {
        console.log('[SW] Syncing scheduled activities...');
        
        const pendingSchedules = JSON.parse(
            localStorage.getItem('pendingActivitySchedules') || '[]'
        );
        
        if (pendingSchedules.length > 0) {
            console.log('[SW] Found pending schedules:', pendingSchedules.length);
            
            localStorage.removeItem('pendingActivitySchedules');
            
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'SYNC_COMPLETE',
                    data: { type: 'activity-scheduling', count: pendingSchedules.length }
                });
            });
        }
    } catch (error) {
        console.error('[SW] Error syncing activity schedules:', error);
    }
}

// Push notifications for activity reminders
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');
    
    const options = {
        body: 'Hora de uma nova atividade educativa!',
        icon: '/assets/icon-192x192.png',
        badge: '/assets/badge-72x72.png',
        vibrate: [200, 100, 200],
        data: {
            url: '/#activities'
        },
        actions: [
            {
                action: 'view',
                title: 'Ver Atividades',
                icon: '/assets/action-view.png'
            },
            {
                action: 'dismiss',
                title: 'Dispensar',
                icon: '/assets/action-dismiss.png'
            }
        ],
        requireInteraction: true,
        silent: false
    };
    
    if (event.data) {
        const data = event.data.json();
        options.body = data.body || options.body;
        options.data = { ...options.data, ...data };
    }
    
    event.waitUntil(
        self.registration.showNotification('EduFérias', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'view' || !event.action) {
        event.waitUntil(
            clients.matchAll({ type: 'window' })
                .then((clientList) => {
                    const url = event.notification.data?.url || '/';
                    
                    // Check if app is already open
                    for (const client of clientList) {
                        if (client.url.includes(url) && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    
                    // Open new window
                    if (clients.openWindow) {
                        return clients.openWindow(url);
                    }
                })
        );
    }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notification closed');
    
    // Track notification dismissal analytics
    // In a real app, this could send analytics data
});

// Periodic background sync for activity suggestions
self.addEventListener('periodicsync', (event) => {
    console.log('[SW] Periodic sync triggered:', event.tag);
    
    if (event.tag === 'activity-suggestions') {
        event.waitUntil(updateActivitySuggestions());
    }
});

// Update activity suggestions in background
async function updateActivitySuggestions() {
    try {
        console.log('[SW] Updating activity suggestions...');
        
        // Get user preferences from storage
        const children = JSON.parse(localStorage.getItem('children') || '[]');
        const stats = JSON.parse(localStorage.getItem('stats') || '{}');
        
        if (children.length > 0) {
            // Generate personalized suggestions
            const suggestions = generatePersonalizedSuggestions(children, stats);
            
            // Cache suggestions
            localStorage.setItem('cachedSuggestions', JSON.stringify({
                suggestions,
                timestamp: Date.now()
            }));
            
            console.log('[SW] Activity suggestions updated');
        }
    } catch (error) {
        console.error('[SW] Error updating activity suggestions:', error);
    }
}

// Generate personalized activity suggestions
function generatePersonalizedSuggestions(children, stats) {
    // Simple algorithm for generating suggestions
    const suggestions = [];
    
    children.forEach(child => {
        // Based on age and interests
        const ageGroup = child.age <= 6 ? 'young' : child.age <= 10 ? 'middle' : 'older';
        const interests = child.interests || [];
        
        // Add age-appropriate suggestions
        if (ageGroup === 'young') {
            suggestions.push({
                title: 'Pintura com Dedos',
                category: 'arte',
                duration: 30,
                childId: child.id
            });
        } else if (ageGroup === 'middle') {
            suggestions.push({
                title: 'Experiência Científica Simples',
                category: 'ciencia',
                duration: 45,
                childId: child.id
            });
        }
        
        // Add interest-based suggestions
        interests.forEach(interest => {
            suggestions.push({
                title: `Atividade de ${interest}`,
                category: interest,
                duration: 60,
                childId: child.id
            });
        });
    });
    
    return suggestions.slice(0, 10); // Limit to 10 suggestions
}

// Message handling from main thread
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    } else if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    } else if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(clearAllCaches());
    }
});

// Clear all caches
async function clearAllCaches() {
    try {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('[SW] All caches cleared');
    } catch (error) {
        console.error('[SW] Error clearing caches:', error);
    }
}

// Error handling
self.addEventListener('error', (event) => {
    console.error('[SW] Service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('[SW] Unhandled promise rejection:', event.reason);
});

console.log('[SW] Service worker loaded successfully');

