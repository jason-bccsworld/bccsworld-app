const CACHE_NAME = 'bccs-mobile-v1';
const urlsToCache = [
  '/',
  '/mobile-field',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background sync for offline document uploads
self.addEventListener('sync', event => {
  if (event.tag === 'document-upload') {
    event.waitUntil(uploadPendingDocuments());
  }
});

async function uploadPendingDocuments() {
  try {
    const pendingUploads = await getPendingUploads();
    
    for (const upload of pendingUploads) {
      try {
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: upload.formData
        });
        
        if (response.ok) {
          await removePendingUpload(upload.id);
        }
      } catch (error) {
        console.log('Upload failed, will retry later:', error);
      }
    }
  } catch (error) {
    console.log('Error processing pending uploads:', error);
  }
}

// Push notifications for compliance alerts
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      vibrate: [200, 100, 200],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.id
      },
      actions: [
        {
          action: 'view',
          title: 'View Details',
          icon: '/icons/icon-192x192.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/icons/icon-192x192.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/mobile-field')
    );
  }
});

// Helper functions for IndexedDB operations
function getPendingUploads() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('bccs-offline', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['uploads'], 'readonly');
      const store = transaction.objectStore('uploads');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('uploads')) {
        db.createObjectStore('uploads', { keyPath: 'id' });
      }
    };
  });
}

function removePendingUpload(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('bccs-offline', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['uploads'], 'readwrite');
      const store = transaction.objectStore('uploads');
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}