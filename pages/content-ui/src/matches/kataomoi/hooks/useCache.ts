import { LRUCache } from '../LRUCache';
import { debounce } from '../utils';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { CacheManager } from '../types';

const SAVE_DEBOUNCE_MS = 7000;

export const useCache = function (
  initialSize: number,
  configLoaded: boolean, // To ensure cache size from config is applied
): [CacheManager, boolean] {
  const [cacheInstance, setCacheInstance] = useState<LRUCache>(new LRUCache(initialSize));
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const isInitialLoad = useRef(true);

  // Debounced save function
  const debouncedSave = useCallback(
    (cacheToSave: LRUCache) =>
      debounce(() => {
        if (cacheToSave.size() > 0 || Object.keys(cacheToSave.toObject()).length > 0) {
          console.log(`[Katakana Translator] Debounced: Saving cache to storage (${cacheToSave.size()} items).`);
          chrome.storage.local.set({ translationCache: cacheToSave.toObject() }, () => {
            if (chrome.runtime.lastError) {
              console.error('[Katakana Translator] Error saving cache:', chrome.runtime.lastError);
            }
          });
        } else {
          console.log('[Katakana Translator] Debounced: Cache is empty, not saving to storage.');
          // Consider chrome.storage.local.remove('translationCache');
        }
      }, SAVE_DEBOUNCE_MS)(),
    [],
  );

  // Load cache from storage on mount
  useEffect(() => {
    chrome.storage.local.get(['translationCache'], result => {
      if (result.translationCache) {
        const lru = new LRUCache(initialSize, result.translationCache as { [key: string]: string });
        setCacheInstance(lru);
        console.log(
          `[Katakana Translator] Cache loaded from storage with ${lru.size()} items. Max size: ${initialSize}`,
        );
      } else {
        // Ensure the instance uses the initialSize even if no cache in storage
        setCacheInstance(new LRUCache(initialSize));
        console.log(`[Katakana Translator] No cache in storage. Initialized empty cache with max size: ${initialSize}`);
      }
      setCacheLoaded(true);
      isInitialLoad.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // initialSize should not change after mount from this hook's perspective

  // Effect to update cache's maxSize if initialSize (from config) changes
  useEffect(() => {
    if (!isInitialLoad.current && configLoaded && cacheInstance.getMaxSize() !== initialSize) {
      console.log(`[Katakana Translator] Configured cacheSize changed to ${initialSize}. Updating cache instance.`);
      // Create a new instance with the new size and existing data
      setCacheInstance(prevCache => {
        const newCache = new LRUCache(initialSize, prevCache.getInternalMap());
        return newCache;
      });
    }
  }, [initialSize, configLoaded, cacheInstance]);

  const cacheManager: CacheManager = {
    get: useCallback((key: string) => cacheInstance.get(key), [cacheInstance]),
    set: useCallback(
      (key: string, value: string) => {
        cacheInstance.set(key, value);
        // Create a new instance for React state update to trigger re-renders if needed by consumers
        // However, for this app, cache changes don't directly drive UI re-renders of KatakanaTranslator itself.
        // The primary effect is that subsequent .get calls will be different.
        // The debouncedSave will operate on the latest cacheInstance.
        // No setCacheInstance(new LRUCache(cacheInstance.getMaxSize(), cacheInstance.getInternalMap())) needed here
        // unless a component relies on `cacheManager` reference changing to re-render.
        debouncedSave(cacheInstance); // Trigger save on set
      },
      [cacheInstance, debouncedSave],
    ),
    has: useCallback((key: string) => cacheInstance.has(key), [cacheInstance]),
    save: useCallback(() => debouncedSave(cacheInstance), [cacheInstance, debouncedSave]),
    instance: cacheInstance,
  };

  return [cacheManager, cacheLoaded];
};
