/**
 * IndexedDB Cache Manager for Comic Assets
 * Provides reliable, offline-ready local binary storage for comic PDF assets.
 * Wrapped in resilient try/catch blocks to gracefully handle private browsing or quota limitations.
 */

const DB_NAME = 'OCU_COMIC_CACHE_V1';
const STORE_NAME = 'comic_files';
const DB_VERSION = 1;

export interface CachedComicRecord {
  id: string;
  title: string;
  buffer: ArrayBuffer;
  savedAt: number;
  byteSize: number;
}

/**
 * Safely open the IndexedDB instance.
 */
export async function openComicCacheDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return null;
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        try {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        } catch (upgradeErr) {
          console.warn('[IndexedDB] Schema upgrade warning:', upgradeErr);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        console.warn('[IndexedDB] Failed to open database:', (event.target as any)?.error);
        resolve(null);
      };

      request.onblocked = () => {
        console.warn('[IndexedDB] Database connection blocked by concurrent tab');
        resolve(null);
      };
    } catch (err) {
      console.warn('[IndexedDB] Unexpected error during open:', err);
      resolve(null);
    }
  });
}

/**
 * Retrieve cached comic PDF buffer by comic ID.
 */
export async function getCachedComic(comicId: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openComicCacheDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(comicId);

        req.onsuccess = () => {
          const record = req.result as CachedComicRecord | undefined;
          if (record && record.buffer && record.buffer instanceof ArrayBuffer) {
            console.log(`[IndexedDB] Cache HIT for comic "${comicId}" (${record.buffer.byteLength} bytes)`);
            resolve(record.buffer);
          } else {
            resolve(null);
          }
        };

        req.onerror = () => {
          resolve(null);
        };

        tx.onabort = () => resolve(null);
      } catch (txErr) {
        console.warn('[IndexedDB] Read transaction error:', txErr);
        resolve(null);
      }
    });
  } catch (err) {
    console.warn('[IndexedDB] Error in getCachedComic:', err);
    return null;
  }
}

/**
 * Store a comic PDF ArrayBuffer in the IndexedDB cache.
 */
export async function setCachedComic(
  comicId: string,
  title: string,
  buffer: ArrayBuffer
): Promise<boolean> {
  try {
    if (!buffer || buffer.byteLength === 0) return false;

    const db = await openComicCacheDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const record: CachedComicRecord = {
          id: comicId,
          title,
          buffer: buffer.slice(0), // copy buffer
          savedAt: Date.now(),
          byteSize: buffer.byteLength,
        };

        const req = store.put(record);

        req.onsuccess = () => {
          console.log(`[IndexedDB] Successfully cached comic "${comicId}" (${record.byteSize} bytes)`);
          resolve(true);
        };

        req.onerror = (err) => {
          console.warn('[IndexedDB] Write operation failed:', err);
          resolve(false);
        };

        tx.oncomplete = () => {
          resolve(true);
        };

        tx.onerror = () => {
          resolve(false);
        };
      } catch (txErr) {
        console.warn('[IndexedDB] Write transaction error:', txErr);
        resolve(false);
      }
    });
  } catch (err) {
    console.warn('[IndexedDB] Error in setCachedComic:', err);
    return false;
  }
}

/**
 * Clear a cached comic from the store.
 */
export async function removeCachedComic(comicId: string): Promise<void> {
  try {
    const db = await openComicCacheDB();
    if (!db) return;

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(comicId);
  } catch (err) {
    console.warn('[IndexedDB] Error in removeCachedComic:', err);
  }
}
