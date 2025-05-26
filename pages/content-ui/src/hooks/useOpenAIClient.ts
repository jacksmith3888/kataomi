import { useState, useEffect } from 'react';
import OpenAI from 'openai';
import type { OpenAIClient } from '../types';

export function useOpenAIClient(apiKey: string, apiUrl: string): [OpenAIClient, Error | null] {
  const [client, setClient] = useState<OpenAIClient>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (apiKey && apiUrl) {
      try {
        const newClient = new OpenAI({
          apiKey: apiKey,
          baseURL: apiUrl,
          dangerouslyAllowBrowser: true,
        });
        setClient(newClient);
        setError(null);
        console.log('[Katakana Translator] OpenAI client initialized.');
      } catch (e) {
        console.error('KatakanaTranslator: Failed to initialize OpenAI client', e);
        setClient(null);
        setError(e instanceof Error ? e : new Error('Unknown error initializing OpenAI client'));
      }
    } else {
      setClient(null);
      if (!apiKey) console.warn('[Katakana Translator] OpenAI API Key is missing.');
      if (!apiUrl) console.warn('[Katakana Translator] OpenAI API URL is missing.');
      setError(null); // Not an error, just not configured
    }
  }, [apiKey, apiUrl]);

  return [client, error];
}
