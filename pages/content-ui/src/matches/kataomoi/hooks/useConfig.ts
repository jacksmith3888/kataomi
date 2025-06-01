import { DEFAULT_CACHE_SIZE, DEFAULT_REQUESTS_PER_SECOND } from '../types';
import { useState, useEffect } from 'react';
import type { ModelConfig } from '../types';

const initialConfigValues: ModelConfig = {
  apiUrl: '',
  modelName: '',
  requestsPerSecond: DEFAULT_REQUESTS_PER_SECOND,
  apiKey: '',
  cacheSize: DEFAULT_CACHE_SIZE,
};

export const useConfig = function (): [ModelConfig, React.Dispatch<React.SetStateAction<ModelConfig>>, boolean] {
  const [config, setConfig] = useState<ModelConfig>(initialConfigValues);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(['modelConfig'], result => {
      let loadedConf = initialConfigValues;
      if (result.modelConfig) {
        const storedConfig = result.modelConfig as Partial<ModelConfig>;
        loadedConf = {
          ...initialConfigValues, // Start with defaults
          ...storedConfig, // Override with stored values
          // Ensure numeric values are valid or default
          requestsPerSecond:
            typeof storedConfig.requestsPerSecond === 'number'
              ? storedConfig.requestsPerSecond
              : DEFAULT_REQUESTS_PER_SECOND,
          cacheSize: typeof storedConfig.cacheSize === 'number' ? storedConfig.cacheSize : DEFAULT_CACHE_SIZE,
        };
      }
      setConfig(loadedConf);
      setConfigLoaded(true);
      console.log('[Katakana Translator] Config loaded:', loadedConf);
    });
  }, []);

  // You might want a function to save config if it's editable by the extension UI
  // const saveConfig = useCallback((newConfig: ModelConfig) => {
  //   setConfig(newConfig);
  //   chrome.storage.local.set({ modelConfig: newConfig });
  // }, []);

  return [config, setConfig, configLoaded];
};
