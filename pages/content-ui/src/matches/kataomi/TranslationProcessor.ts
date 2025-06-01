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

interface TranslationSettings {
  targetLanguage: string;
  filterOptions: string[];
  customFilter: string;
}

// Default settings if not found in storage
const defaultTranslationSettings: TranslationSettings = {
  targetLanguage: 'Chinese',
  filterOptions: [],
  customFilter: '',
};

const filterCategoryMapping: Record<string, string> = {
  names: 'names of people, places',
  animals: 'animals',
  science: 'physics, chemistry, biology',
  medical: 'diseases',
  humanities: 'astronomy, history, philosophy, psychology',
  vegetables: 'vegetables, fruits',
};

export class TranslationProcessor {
  private opts: TranslationProcessorOptions;
  private isProcessingChunk: boolean = false;
  private translationSettings: TranslationSettings = defaultTranslationSettings;

  constructor(options: TranslationProcessorOptions) {
    this.opts = options;
    this.loadTranslationSettings();
    chrome.storage.onChanged.addListener(changes => {
      if (changes.translationSettings) {
        this.translationSettings = changes.translationSettings.newValue || defaultTranslationSettings;
        console.log('[TranslationProcessor] Translation settings updated:', this.translationSettings);
      }
    });
  }

  private async loadTranslationSettings(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['translationSettings']);
      if (result.translationSettings) {
        this.translationSettings = result.translationSettings;
      } else {
        // Save default settings if nothing is found
        await chrome.storage.local.set({ translationSettings: defaultTranslationSettings });
      }
      console.log('[TranslationProcessor] Initial translation settings:', this.translationSettings);
    } catch (error) {
      console.error('[TranslationProcessor] Error loading translation settings:', error);
      // Use default settings in case of an error
      this.translationSettings = defaultTranslationSettings;
    }
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

        const { targetLanguage, filterOptions, customFilter } = this.translationSettings;
        const selectedFilterCategories = filterOptions.map(opt => filterCategoryMapping[opt]).filter(Boolean);
        const customKeywords = customFilter
          .split(',')
          .map(k => k.trim())
          .filter(Boolean);
        const allFilterKeywords = [...selectedFilterCategories, ...customKeywords];

        let systemPrompt = `You are a translator that converts Japanese katakana words to their original words.`;

        if (allFilterKeywords.length > 0) {
          systemPrompt += `
            Translate all katakana words to English, except for content related to ${allFilterKeywords.join(', ')}, which should be translated into ${targetLanguage}.
            For words translated to ${targetLanguage} that do not originate from ${targetLanguage}, include the source language in parentheses after the translation using ISO 639-1 language codes, e.g., (fr) for French.
            Do NOT include any source language annotation or additional text like '${targetLanguage}' for words translated into ${targetLanguage}.
            Words not matching any filter criteria should be translated to English.
            Return strictly the translated result only. Do not include the original word or any additional text.`;
        } else {
          systemPrompt += `
            Translate all katakana words to English.
            For words translated to English that do not originate from English, include the source language in parentheses after the translation using ISO 639-1 language codes, e.g., (fr) for French.
            Return strictly the translated result only. Do not include the original word or any additional text.`;
        }

        console.log(`[TranslationProcessor] Translating chunk: ${chunk.join(', ')} with prompt: ${systemPrompt}`);
        const completion = await openaiClient.chat.completions.create({
          model: config.modelName,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
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
