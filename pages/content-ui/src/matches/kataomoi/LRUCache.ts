// LRU Cache implementation using Map for better performance and ordering
export class LRUCache {
  private cache: Map<string, string>;
  private maxSize: number;

  constructor(maxSize: number = 10000, initialData?: Map<string, string> | { [key: string]: string }) {
    this.maxSize = maxSize > 0 ? maxSize : 0; // Ensure maxSize is not negative
    if (initialData instanceof Map) {
      this.cache = new Map(initialData);
    } else if (initialData && typeof initialData === 'object') {
      this.cache = new Map();
      this.fromObject(initialData); // Use existing fromObject for plain objects
    } else {
      this.cache = new Map();
    }
    this.ensureMaxSize();
  }

  private ensureMaxSize(): void {
    if (this.maxSize === 0) {
      this.cache.clear();
      return;
    }
    while (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      } else {
        break; // Should not happen if size > 0
      }
    }
  }

  get(key: string): string | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: string): void {
    if (this.maxSize === 0) return;

    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  toObject(): { [key: string]: string } {
    const obj: { [key: string]: string } = {};
    for (const [key, value] of this.cache) {
      obj[key] = value;
    }
    return obj;
  }

  fromObject(obj: { [key: string]: string }): void {
    this.cache.clear();
    if (this.maxSize === 0) return;

    const entries = Object.entries(obj);
    // Load up to maxSize entries, prefering later entries if obj is larger than maxSize
    const startIndex = Math.max(0, entries.length - this.maxSize);
    for (let i = startIndex; i < entries.length; i++) {
      const [key, value] = entries[i];
      if (this.cache.size < this.maxSize) {
        // Check before setting
        this.cache.set(key, value);
      } else {
        break; // Reached maxSize
      }
    }
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }

  getInternalMap(): Map<string, string> {
    return new Map(this.cache); // Return a copy to prevent external mutation
  }

  getMaxSize(): number {
    return this.maxSize;
  }

  updateMaxSize(newMaxSize: number): void {
    this.maxSize = newMaxSize > 0 ? newMaxSize : 0;
    this.ensureMaxSize();
  }
}
