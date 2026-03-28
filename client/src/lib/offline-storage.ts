// Offline storage utility for mobile field operations
interface PendingUpload {
  id: string;
  file: File;
  formData: FormData;
  timestamp: number;
  metadata?: {
    location?: { lat: number; lng: number };
    inspector?: string;
    notes?: string;
  };
}

interface OfflineData {
  documents: any[];
  lastSync: number;
  pendingUploads: PendingUpload[];
}

class OfflineStorage {
  private dbName = 'bccs-offline';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('uploads')) {
          db.createObjectStore('uploads', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  async storePendingUpload(upload: Omit<PendingUpload, 'id' | 'timestamp'>): Promise<string> {
    if (!this.db) await this.init();

    const id = crypto.randomUUID();
    const pendingUpload: PendingUpload = {
      ...upload,
      id,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['uploads'], 'readwrite');
      const store = transaction.objectStore('uploads');
      const request = store.add(pendingUpload);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingUploads(): Promise<PendingUpload[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['uploads'], 'readonly');
      const store = transaction.objectStore('uploads');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingUpload(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['uploads'], 'readwrite');
      const store = transaction.objectStore('uploads');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async cacheDocuments(documents: any[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['documents', 'metadata'], 'readwrite');
      const docStore = transaction.objectStore('documents');
      const metaStore = transaction.objectStore('metadata');

      // Clear existing documents
      docStore.clear();

      // Store new documents
      documents.forEach(doc => {
        docStore.add(doc);
      });

      // Update last sync timestamp
      metaStore.put({
        key: 'lastSync',
        value: Date.now()
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getCachedDocuments(): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['documents'], 'readonly');
      const store = transaction.objectStore('documents');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getLastSync(): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get('lastSync');

      request.onsuccess = () => {
        resolve(request.result?.value || 0);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async syncPendingUploads(): Promise<{ success: number; failed: number }> {
    const pendingUploads = await this.getPendingUploads();
    let success = 0;
    let failed = 0;

    for (const upload of pendingUploads) {
      try {
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: upload.formData
        });

        if (response.ok) {
          await this.removePendingUpload(upload.id);
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error('Upload sync failed:', error);
        failed++;
      }
    }

    return { success, failed };
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['uploads', 'documents', 'metadata'], 'readwrite');
      
      transaction.objectStore('uploads').clear();
      transaction.objectStore('documents').clear();
      transaction.objectStore('metadata').clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const offlineStorage = new OfflineStorage();

// Helper function to check if we're online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Helper function to register background sync
export async function registerBackgroundSync(tag: string): Promise<void> {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register(tag);
  }
}

// Helper function to request persistent storage
export async function requestPersistentStorage(): Promise<boolean> {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    return await navigator.storage.persist();
  }
  return false;
}