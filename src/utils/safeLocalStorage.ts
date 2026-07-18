/**
 * Safe localStorage wrapper that gracefully handles blocked storage/cookies inside iframe sandboxes
 */
const memoryStore: Record<string, string> = {};

export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined') {
        const storage = window.localStorage;
        if (storage) {
          return storage.getItem(key);
        }
      }
    } catch (e) {
      console.warn(`[localStorage] Access denied for getItem('${key}'):`, e);
    }
    return memoryStore[key] !== undefined ? memoryStore[key] : null;
  },

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined') {
        const storage = window.localStorage;
        if (storage) {
          storage.setItem(key, value);
          return;
        }
      }
    } catch (e) {
      console.warn(`[localStorage] Access denied for setItem('${key}'):`, e);
    }
    memoryStore[key] = String(value);
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined') {
        const storage = window.localStorage;
        if (storage) {
          storage.removeItem(key);
          return;
        }
      }
    } catch (e) {
      console.warn(`[localStorage] Access denied for removeItem('${key}'):`, e);
    }
    delete memoryStore[key];
  },

  clear(): void {
    try {
      if (typeof window !== 'undefined') {
        const storage = window.localStorage;
        if (storage) {
          storage.clear();
          return;
        }
      }
    } catch (e) {
      console.warn('[localStorage] Access denied for clear():', e);
    }
    for (const key of Object.keys(memoryStore)) {
      delete memoryStore[key];
    }
  }
};

