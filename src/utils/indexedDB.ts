/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CharacterImage } from '../types';

const DB_NAME = 'VSyncEngineDB';
const DB_VERSION = 3;
const STORE_NAME = 'images';
const BG_STORE_NAME = 'bg_music';
const CONFIG_FILES_STORE_NAME = 'config_files';
const VIDEOS_STORE_NAME = 'videos';

/**
 * Initializes the IndexedDB instance for VSync Engine
 */
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open browser IndexedDB'));
      };

      request.onsuccess = (e) => {
        resolve((e.target as IDBOpenDBRequest).result);
      };

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(BG_STORE_NAME)) {
          db.createObjectStore(BG_STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(CONFIG_FILES_STORE_NAME)) {
          db.createObjectStore(CONFIG_FILES_STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(VIDEOS_STORE_NAME)) {
          db.createObjectStore(VIDEOS_STORE_NAME, { keyPath: 'id' });
        }
      };
    } catch (err) {
      console.warn("IndexedDB open threw error synchronously:", err);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/**
 * Saves a list of character images into the IndexedDB store.
 * The raw File/Blob buffer is stored.
 */
export function saveImagesToDB(images: CharacterImage[]): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      images.forEach((img) => {
        // Store raw File content, name, path, keywords, and ID.
        // Object URLs change on every page session, so we don't store them unless they are local API links.
        const dataToStore = {
          id: img.id,
          name: img.name,
          path: img.path,
          file: img.file || null,
          url: img.file ? undefined : img.url,
          keywords: img.keywords,
          characterName: img.characterName,
        };
        store.put(dataToStore);
      });

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error('Transaction failure during saving images to IndexedDB'));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Retrieves all saved character images from IndexedDB, automatically recreating
 * safe local Object URLs to render them inside standard iframe HTML elements.
 */
export function getAllImagesFromDB(): Promise<CharacterImage[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result || [];
        const reconstructed: CharacterImage[] = results.map((item: any) => {
          // Recreate Object URL for use inside active session DOM elements with extra safety checks
          let url = '';
          try {
            if (item.file && (item.file instanceof Blob || item.file instanceof File)) {
              url = URL.createObjectURL(item.file);
            } else if (item.url) {
              url = item.url;
            } else if (item.path) {
              url = `/api/local-folder/file?path=${encodeURIComponent(item.path)}`;
            } else {
              url = '';
            }
          } catch (e) {
            console.error("Error creating Object URL for stored item:", item, e);
            url = item.url || (item.path ? `/api/local-folder/file?path=${encodeURIComponent(item.path)}` : '');
          }
          return {
            id: item.id,
            name: item.name,
            path: item.path || '',
            url,
            file: item.file || undefined,
            keywords: item.keywords || [],
            characterName: item.characterName,
          };
        });
        resolve(reconstructed);
      };

      request.onerror = () => {
        reject(new Error('Failed to retrieve catalog from IndexedDB'));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Deletes a single image by its generated ID
 */
export function deleteImageFromDB(id: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to delete index ${id}`));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Clears the entirety of the character images store
 */
export function clearAllImagesFromDB(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear database table'));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Saves a list of background music files into IndexedDB
 */
export function saveBgMusicToDB(items: Array<{ id: string; name: string; file: File; volume?: number }>): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(BG_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(BG_STORE_NAME);

      store.clear();

      items.forEach((item) => {
        store.put({
          id: item.id,
          name: item.name,
          file: item.file,
          volume: item.volume !== undefined ? item.volume : 100
        });
      });

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error('Lỗi đồng bộ danh sách nhạc nền vào IndexedDB'));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Retrieves all saved background music tracks from IndexedDB, generating brand-new Object URLs
 */
export function getAllBgMusicFromDB(): Promise<Array<{ id: string; name: string; url: string; file: File; volume?: number }>> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(BG_STORE_NAME, 'readonly');
      const store = transaction.objectStore(BG_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result || [];
        const mapped = results.map((item: any) => {
          const url = URL.createObjectURL(item.file);
          return {
            id: item.id,
            name: item.name,
            url,
            file: item.file,
            volume: item.volume !== undefined ? item.volume : 100
          };
        });
        resolve(mapped);
      };

      request.onerror = () => {
        reject(new Error('Lỗi load danh sách nhạc nền từ IndexedDB'));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Saves a single config-related media File (like custom intro/outro video)
 */
export function saveConfigFileToDB(id: 'intro-video' | 'outro-video', file: File): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(CONFIG_FILES_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(CONFIG_FILES_STORE_NAME);
      
      const request = store.put({ id, file, name: file.name });
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to save config file ${id}`));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Gets a custom config-related file as native File object
 */
export function getConfigFileFromDB(id: 'intro-video' | 'outro-video'): Promise<File | null> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(CONFIG_FILES_STORE_NAME, 'readonly');
      const store = transaction.objectStore(CONFIG_FILES_STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.file);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        reject(new Error(`Failed to get config file ${id}`));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Deletes a config-related file
 */
export function deleteConfigFileFromDB(id: 'intro-video' | 'outro-video'): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(CONFIG_FILES_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(CONFIG_FILES_STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to delete config file ${id}`));
      };
    } catch (err) {
      reject(err);
    }
  });
}


