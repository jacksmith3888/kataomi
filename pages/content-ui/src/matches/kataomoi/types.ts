import type { LRUCache } from './LRUCache';
import type { MessageKeyType } from '@extension/i18n/lib/types';
import type { OpenAI } from 'openai';

export const DEFAULT_CACHE_SIZE = 10000;
export const DEFAULT_REQUESTS_PER_SECOND = 10;

export interface ModelConfig {
  apiUrl: string;
  modelName: string;
  requestsPerSecond: number;
  apiKey: string;
  cacheSize: number; // Made non-optional, will have a default
}

export interface KatakanaToken {
  word: string;
  rtElements: HTMLElement[];
}

// For functions that interact with the cache
export interface CacheManager {
  get: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  has: (key: string) => boolean;
  save: () => void; // Triggers debounced save
  instance: LRUCache; // Expose instance if needed for direct manipulation (e.g. maxSize change)
}

// For the DOM scanner
export type WordFoundCallback = (word: string, rtElement: HTMLElement) => void;
export type ScanNodeFunction = (node: Element | ShadowRoot) => void;

// For OpenAI client
export type OpenAIClient = OpenAI | null;

// Use the actual type from the i18n package
export type TFunction = (key: MessageKeyType, substitutions?: string | string[]) => string;
