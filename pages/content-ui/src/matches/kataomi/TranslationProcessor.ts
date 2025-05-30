import type { ModelConfig, CacheManager, OpenAIClient } from './types';

interface TranslationProcessorOptions {
  config: ModelConfig;
  cacheManager: CacheManager;
  openaiClient: OpenAIClient;
  getQueuedRtElements: (phrase: string) => HTMLElement[] | undefined;
  onTranslationComplete: (phrase: string, translation: string, rtElements: HTMLElement[]) => void;
  onProcessingError: (phrase: string, errorMsg: string, rtElements: HTMLElement[]) => void;
  onQueueProcessed: (phrases: string[]) => void; // Callback to remove phrases from component's queue state
  t: (key: string) => string; // Translation function
}

export class TranslationProcessor {
  private opts: TranslationProcessorOptions;
  private isProcessingChunk: boolean = false;

  constructor(options: TranslationProcessorOptions) {
    this.opts = options;
  }

  public async processPhrases(phrasesToProcess: string[]): Promise<void> {
    if (this.isProcessingChunk || phrasesToProcess.length === 0) return;

    const { config, cacheManager, openaiClient, t, getQueuedRtElements, onQueueProcessed } = this.opts;

    if (!config.apiKey || !config.apiUrl) {
      console.warn('[Katakana Translator] API key or API URL is missing. Cannot translate.');
      phrasesToProcess.forEach(phrase => {
        const rtElements = getQueuedRtElements(phrase) || [];
        this.opts.onProcessingError(phrase, t('apiConfigMissing'), rtElements);
      });
      onQueueProcessed(phrasesToProcess);
      return;
    }

    if (!openaiClient) {
      console.warn('[Katakana Translator] OpenAI client not initialized. Cannot translate yet.');
      // Don't clear queue, wait for client
      return;
    }

    this.isProcessingChunk = true;
    console.log(`[TranslationProcessor] Processing ${phrasesToProcess.length} phrases.`);

    const phrasesForApiCall: string[] = [];
    const locallyHandledPhrases: string[] = [];

    for (const phrase of phrasesToProcess) {
      const cachedTranslation = cacheManager.get(phrase);
      const rtElements = getQueuedRtElements(phrase) || [];
      if (cachedTranslation) {
        this.opts.onTranslationComplete(phrase, cachedTranslation, rtElements);
        locallyHandledPhrases.push(phrase);
      } else {
        phrasesForApiCall.push(phrase);
      }
    }

    if (locallyHandledPhrases.length > 0) {
      onQueueProcessed(locallyHandledPhrases);
    }

    if (phrasesForApiCall.length === 0) {
      this.isProcessingChunk = false;
      return;
    }

    const chunks: string[][] = [];
    for (let i = 0; i < phrasesForApiCall.length; i += config.requestsPerSecond) {
      chunks.push(phrasesForApiCall.slice(i, i + config.requestsPerSecond));
    }

    for (const chunk of chunks) {
      try {
        if (!config.modelName) {
          throw new Error('Model name is not configured.');
        }
        console.log(`[TranslationProcessor] Translating chunk: ${chunk.join(', ')}`);
        const completion = await openaiClient.chat.completions.create({
          model: config.modelName,
          messages: [
            {
              role: 'system',
              content:
                'You are a translator that converts Japanese katakana words to their original words.Notice that Japanese katakana words may come from not only English but also other languages including French, Spanish,etc. Only return the original word nothing else.',
            },
            { role: 'user', content: chunk.join('\n') },
          ],
          temperature: 0.7,
        });

        const apiContent = completion.choices[0]?.message?.content;
        if (!apiContent) {
          throw new Error('API response did not contain content.');
        }
        const translations = apiContent.split('\n');

        chunk.forEach((originalPhrase, index) => {
          const translation = translations[index]?.trim() || 'Error: No translation';
          const rtElements = getQueuedRtElements(originalPhrase) || [];
          this.opts.onTranslationComplete(originalPhrase, translation, rtElements);
          if (translation && !translation.startsWith('Error:')) {
            // Only cache valid translations
            cacheManager.set(originalPhrase, translation);
          }
        });
        onQueueProcessed(chunk); // Remove successfully processed chunk from queue
      } catch (apiError: unknown) {
        console.error('[TranslationProcessor] Translation chunk error:', apiError);
        const errorMsg = apiError instanceof Error ? apiError.message : 'Error: API Call Failed';
        chunk.forEach(phrase => {
          const rtElements = getQueuedRtElements(phrase) || [];
          this.opts.onProcessingError(phrase, errorMsg, rtElements);
        });
        onQueueProcessed(chunk); // Remove errored chunk from queue to prevent re-processing loop
      }

      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 / (config.requestsPerSecond || 1))); // Adhere to rate limit
      }
    }
    this.isProcessingChunk = false;
  }
}
