import { useCache } from './hooks/useCache';
import { useConfig } from './hooks/useConfig';
import { useDomScanner } from './hooks/useDomScanner';
import { useMutationObserver } from './hooks/useMutationObserver';
import { useOpenAIClient } from './hooks/useOpenAIClient';
import { injectStylesIntoHead } from './styles';
import { TranslationProcessor } from './TranslationProcessor';
import { t } from '@extension/i18n';
import { useState, useEffect, useCallback, useRef } from 'react';
import type React from 'react';

const KatakanaTranslator: React.FC = () => {
  const [config, , configLoaded] = useConfig();
  const [cacheManager, cacheLoaded] = useCache(config.cacheSize, configLoaded);
  const [openaiClient, openaiError] = useOpenAIClient(config.apiKey, config.apiUrl);

  const [translationQueue, setTranslationQueue] = useState<Record<string, HTMLElement[]>>({});
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [initialScanComplete, setInitialScanComplete] = useState(false);

  const translationProcessorRef = useRef<TranslationProcessor | null>(null);

  const handleWordFound = useCallback(
    (word: string, rtElement: HTMLElement) => {
      const cachedTranslation = cacheManager.get(word);
      if (cachedTranslation) {
        rtElement.setAttribute('data-rt', cachedTranslation);
      } else {
        rtElement.setAttribute('data-rt', '⏳');
        setTranslationQueue(prevQueue => ({
          ...prevQueue,
          [word]: [...(prevQueue[word] || []), rtElement],
        }));
      }
    },
    [cacheManager],
  );

  const { scanNode } = useDomScanner(handleWordFound);

  useEffect(() => {
    if (configLoaded && cacheLoaded && openaiClient !== undefined && cacheManager) {
      translationProcessorRef.current = new TranslationProcessor({
        config,
        cacheManager,
        openaiClient,
        t,
        getQueuedRtElements: phrase => translationQueue[phrase],
        onTranslationComplete: (phrase, translation, rtElements) => {
          rtElements.forEach(rt => rt.setAttribute('data-rt', translation));
        },
        onProcessingError: (phrase, errorMsg, rtElements) => {
          rtElements.forEach(rt => rt.setAttribute('data-rt', errorMsg));
        },
        onQueueProcessed: processedPhrases => {
          setTranslationQueue(prev => {
            const newQueue = { ...prev };
            processedPhrases.forEach(p => delete newQueue[p]);
            return newQueue;
          });
        },
      });
      console.log('[Katakana Translator] TranslationProcessor initialized/updated.');
    }
  }, [config, cacheManager, openaiClient, configLoaded, cacheLoaded, translationQueue, t]);

  useEffect(() => {
    if (configLoaded && cacheLoaded && !initialScanComplete) {
      console.log('[Katakana Translator] Config and cache loaded, performing initial scan.');
      injectStylesIntoHead();
      scanNode(document.body);
      setInitialScanComplete(true);
    }
  }, [configLoaded, cacheLoaded, initialScanComplete, scanNode]);

  useMutationObserver(scanNode, initialScanComplete);

  useEffect(() => {
    const phrasesInQueue = Object.keys(translationQueue);
    if (phrasesInQueue.length > 0 && translationProcessorRef.current && !isProcessingQueue) {
      setIsProcessingQueue(true);
      console.log(`[Katakana Translator] Triggering queue processing for ${phrasesInQueue.length} unique phrases.`);
      translationProcessorRef.current.processPhrases(phrasesInQueue).finally(() => {
        setIsProcessingQueue(false);
      });
    }
  }, [translationQueue, isProcessingQueue]);

  useEffect(() => {
    if (openaiError) {
      console.error('[Katakana Translator] OpenAI Client Error:', openaiError.message);
    }
  }, [openaiError]);

  return null;
};

export default KatakanaTranslator;
