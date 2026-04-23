export type StorageArea = 'local' | 'sync' | 'session';

export interface StorageAdapter {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  getAll<T extends Record<string, unknown>>(): Promise<T>;
  clear(): Promise<void>;
}

const hasChromeStorage = () => typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);

const getWebStorage = (area: StorageArea): Storage | null => {
  if (typeof window === 'undefined') return null;

  if (area === 'session') {
    return window.sessionStorage;
  }

  return window.localStorage;
};

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

class WebStorageAdapter implements StorageAdapter {
  constructor(
    private readonly storage: Storage,
    private readonly area: StorageArea
  ) {}

  private getScopedKey(key: string) {
    return `brandops:${this.area}:${key}`;
  }

  private safeParse<T>(raw: string, scopedKey: string): T | undefined {
    try {
      return JSON.parse(raw) as T;
    } catch {
      // Corrupted entries should not brick the workspace boot path.
      this.storage.removeItem(scopedKey);
      return undefined;
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    const scopedKey = this.getScopedKey(key);
    const raw = this.storage.getItem(scopedKey);
    if (!raw) return undefined;

    return this.safeParse<T>(raw, scopedKey);
  }

  async set<T>(key: string, value: T): Promise<void> {
    const scopedKey = this.getScopedKey(key);
    try {
      this.storage.setItem(scopedKey, JSON.stringify(value));
    } catch (error) {
      throw new Error(
        `Failed to persist workspace data in ${this.area} storage for key "${key}": ${(error as Error).message}`
      );
    }
  }

  async remove(key: string): Promise<void> {
    this.storage.removeItem(this.getScopedKey(key));
  }

  async getAll<T extends Record<string, unknown>>(): Promise<T> {
    const prefix = this.getScopedKey('');
    const entries: Array<[string, unknown]> = [];

    for (let index = 0; index < this.storage.length; index += 1) {
      const storageKey = this.storage.key(index);
      if (!storageKey || !storageKey.startsWith(prefix)) continue;

      const raw = this.storage.getItem(storageKey);
      if (!raw) continue;

      const key = storageKey.slice(prefix.length);
      const parsed = this.safeParse<unknown>(raw, storageKey);
      if (parsed === undefined) continue;
      entries.push([key, parsed]);
    }

    return Object.fromEntries(entries) as T;
  }

  async clear(): Promise<void> {
    const prefix = this.getScopedKey('');
    const keysToRemove: string[] = [];

    for (let index = 0; index < this.storage.length; index += 1) {
      const storageKey = this.storage.key(index);
      if (storageKey?.startsWith(prefix)) {
        keysToRemove.push(storageKey);
      }
    }

    keysToRemove.forEach((storageKey) => this.storage.removeItem(storageKey));
  }
}

class MemoryStorageAdapter implements StorageAdapter {
  private readonly store = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.store.get(key) as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getAll<T extends Record<string, unknown>>(): Promise<T> {
    return Object.fromEntries(this.store.entries()) as T;
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

export const getBrowserStorage = (area: StorageArea = 'local'): StorageAdapter => {
  if (hasChromeStorage()) {
    if (area === 'sync') return new BrowserStorageAdapter(chrome.storage.sync);
    if (area === 'session') return new BrowserStorageAdapter(chrome.storage.session);
    return new BrowserStorageAdapter(chrome.storage.local);
  }

  const webStorage = getWebStorage(area);
  if (webStorage) {
    return new WebStorageAdapter(webStorage, area);
  }

  return new MemoryStorageAdapter();
};

export const browserLocalStorage: StorageAdapter = getBrowserStorage('local');
