import { t } from '@extension/i18n';
import { OpenAI } from 'openai';
import { useState, useEffect } from 'react';
import type { OpenAIClient } from '../types';

export const useOpenAIClient = function (apiKey: string, apiUrl: string): [OpenAIClient, Error | null] {
  const [client, setClient] = useState<OpenAIClient>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (apiKey && apiUrl) {
      try {
        const newClient = new OpenAI({
          apiKey: apiKey,
          baseURL: `${apiUrl}/v1/`,
          dangerouslyAllowBrowser: true,
        });
        setClient(newClient);
        setError(null);
        console.log('[Katakana Translator] OpenAI client initialized.');
      } catch (e) {
        console.error('KatakanaTranslator: Failed to initialize OpenAI client', e);
        setClient(null);
        setError(e instanceof Error ? e : new Error(t('errorUnknownClient')));
      }
    } else {
      setClient(null);
      if (!apiKey) console.warn('[Katakana Translator] OpenAI API Key is missing.');
      if (!apiUrl) console.warn('[Katakana Translator] OpenAI API URL is missing.');
      setError(null); // Not an error, just not configured
    }
  }, [apiKey, apiUrl]);

  return [client, error];
};
