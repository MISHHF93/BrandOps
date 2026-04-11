export type StorageArea = 'local' | 'sync' | 'session';

export interface StorageAdapter {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  getAll<T extends Record<string, unknown>>(): Promise<T>;
  clear(): Promise<void>;
}

class BrowserStorageAdapter implements StorageAdapter {
  constructor(private readonly area: chrome.storage.StorageArea) {}

  async get<T>(key: string): Promise<T | undefined> {
    const result = await this.area.get(key);
    return result[key] as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.area.set({ [key]: value });
  }

  async remove(key: string): Promise<void> {
    await this.area.remove(key);
  }

  async getAll<T extends Record<string, unknown>>(): Promise<T> {
    const result = await this.area.get(null);
    return result as T;
  }

  async clear(): Promise<void> {
    await this.area.clear();
  }
}

export const getBrowserStorage = (area: StorageArea = 'local'): StorageAdapter => {
  if (area === 'sync') return new BrowserStorageAdapter(chrome.storage.sync);
  if (area === 'session') return new BrowserStorageAdapter(chrome.storage.session);
  return new BrowserStorageAdapter(chrome.storage.local);
};

export const browserLocalStorage: StorageAdapter = getBrowserStorage('local');
