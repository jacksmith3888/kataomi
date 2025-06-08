import '@src/Popup.css';
import { t } from '@extension/i18n';
import enMessages from '@extension/i18n/locales/en/messages.json';
import { PROJECT_URL_OBJECT, useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { Trash2, Download, Upload } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast, Toaster } from 'react-hot-toast';

interface ModelConfig {
  apiUrl: string;
  modelName: string;
  requestsPerSecond: number;
  apiKey: string;
}

const defaultConfig: ModelConfig = {
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  modelName: 'gpt-3.5-turbo',
  requestsPerSecond: 10,
  apiKey: '',
};

interface TranslationSettings {
  targetLanguage: string;
  filterOptions: string[];
  customFilter: string;
}

const defaultTranslationSettings: TranslationSettings = {
  targetLanguage: 'Chinese',
  filterOptions: [],
  customFilter: '',
};

const availableFilterOptions = [
  { id: 'names', labelKey: 'filterNames' },
  { id: 'animals', labelKey: 'filterAnimals' },
  { id: 'acg', labelKey: 'filterAcg' },
  { id: 'science', labelKey: 'filterScience' },
  { id: 'medical', labelKey: 'filterMedical' },
  { id: 'humanities', labelKey: 'filterHumanities' },
  { id: 'vegetables', labelKey: 'filterVegetables' },
  { id: 'fruits', labelKey: 'filterFruits' },
] as const;

const availableLanguages = [
  { value: 'Chinese', labelKey: 'langChinese' },
  { value: 'English', labelKey: 'langEnglish' },
  { value: 'Korean', labelKey: 'langKorean' },
  { value: 'French', labelKey: 'langFrench' },
  { value: 'German', labelKey: 'langGerman' },
  { value: 'Spanish', labelKey: 'langSpanish' },
  { value: 'Vietnamese', labelKey: 'langVietnamese' },
  { value: 'Filipino', labelKey: 'langFilipino' },
  { value: 'Portuguese', labelKey: 'langPortuguese' },
] as const;

const Popup = () => {
  const [config, setConfig] = useState<ModelConfig>(defaultConfig);
  const [translationSettings, setTranslationSettings] = useState<TranslationSettings>(defaultTranslationSettings);
  const [isSaved, setIsSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const { isLight } = useStorage(exampleThemeStorage);
  const goGithubSite = () => chrome.tabs.create(PROJECT_URL_OBJECT);
  const githubIconColor = isLight ? '334155' : 'f3f4f6';
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load saved config from storage
    chrome.storage.local.get(['modelConfig', 'translationSettings'], result => {
      if (result.modelConfig) {
        setConfig(result.modelConfig);
      }
      if (result.translationSettings) {
        setTranslationSettings(result.translationSettings);
      }
    });
  }, []);

  const parseCsvAndImport = (csvString: string) => {
    const rows = csvString.trim().split('\n');
    const headers = rows.shift()?.split(',');

    if (!headers || headers[0] !== 'Original' || headers[1] !== 'Translation') {
      toast.error(t('toastCsvFormatError'));
      return;
    }

    const newCache: { [key: string]: string } = {};
    const unescapeCsvField = (field: string) => {
      if (field.startsWith('"') && field.endsWith('"')) {
        return field.slice(1, -1).replace(/""/g, '"');
      }
      return field;
    };

    rows.forEach(row => {
      // Simple parsing, may not handle all edge cases like commas within quoted fields
      const [original, translation] = row.split(',').map(unescapeCsvField);
      if (original && translation) {
        newCache[original] = translation;
      }
    });

    chrome.storage.local.get(['translationCache'], result => {
      const existingCache = (result.translationCache as { [key: string]: string }) || {};
      const mergedCache = { ...existingCache, ...newCache };

      chrome.storage.local.set({ translationCache: mergedCache }, () => {
        if (chrome.runtime.lastError) {
          toast.error(t('displayErrorImport'));
        } else {
          toast.success(t('toastImportSuccess', [Object.keys(newCache).length.toString()]));
        }
      });
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.type !== 'text/csv') {
      toast.error(t('toastSelectCsvFile'));
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      parseCsvAndImport(text);
    };
    reader.onerror = () => {
      toast.error(t('toastReadFileError'));
    };
    reader.readAsText(file);

    // Reset file input
    event.target.value = '';
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleExportCsv = () => {
    chrome.storage.local.get(['translationCache'], result => {
      if (chrome.runtime.lastError) {
        toast.error(t('toastLoadCacheError'));
        console.error('Error loading cache for export:', chrome.runtime.lastError);
        return;
      }

      const cache = result.translationCache as { [key: string]: string };
      if (!cache || Object.keys(cache).length === 0) {
        toast.error(t('toastNoCacheToExport'));
        return;
      }

      const headers = ['Original', 'Translation'];
      const escapeCsvField = (field: string) => {
        if (/[",\n]/.test(field)) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      };

      const csvRows = [headers.join(',')];
      for (const [key, value] of Object.entries(cache)) {
        csvRows.push([escapeCsvField(key), escapeCsvField(value)].join(','));
      }
      const csvString = csvRows.join('\n');

      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'translation_cache.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(t('displaySuccessExport'));
    });
  };

  const handleClearCache = () => {
    if (window.confirm(t('confirmClearCache'))) {
      chrome.storage.local.remove('translationCache', () => {
        toast.success(t('toastCacheCleared'));
      });
    }
  };

  const handleSave = () => {
    chrome.storage.local.set({ modelConfig: config, translationSettings: translationSettings }, () => {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    });
  };

  const handleInputChange = (field: keyof ModelConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'requestsPerSecond' ? parseInt(e.target.value) || 0 : e.target.value;
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleTranslationSettingChange = <K extends keyof TranslationSettings>(
    field: K,
    value: TranslationSettings[K],
  ) => {
    setTranslationSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleFilterOptionChange = (optionId: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentFilters = translationSettings.filterOptions;
    const option = availableFilterOptions.find(opt => opt.id === optionId);
    if (!option) return;

    // The key to look up in the enMessages object
    const labelKey = option.labelKey as keyof typeof enMessages;
    // The English text label
    const englishLabel = enMessages[labelKey]?.message || optionId;

    let newFilters;
    if (e.target.checked) {
      newFilters = [...currentFilters, englishLabel];
    } else {
      newFilters = currentFilters.filter(label => label !== englishLabel);
    }
    handleTranslationSettingChange('filterOptions', newFilters);
  };

  return (
    <div className={`App min-w-[400px] p-5 ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
      <Toaster position="top-center" reverseOrder={false} />
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".csv" />
      <div className={`space-y-4 ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">{t('settingsTitle')}</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleImportClick}
              className={`rounded p-2 text-sm font-medium shadow-sm hover:opacity-80 ${
                isLight
                  ? 'bg-green-200 text-green-600 hover:bg-green-300'
                  : 'bg-green-800 text-green-200 hover:bg-green-700'
              }`}
              title={t('importButtonTitle')}>
              <Upload className="h-4 w-4" />
            </button>
            <button
              onClick={handleExportCsv}
              className={`rounded p-2 text-sm font-medium shadow-sm hover:opacity-80 ${
                isLight ? 'bg-blue-200 text-blue-600 hover:bg-blue-300' : 'bg-blue-800 text-blue-200 hover:bg-blue-700'
              }`}
              title={t('exportButtonTitle')}>
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={handleClearCache}
              className={`rounded p-2 text-sm font-medium shadow-sm hover:opacity-80 ${
                isLight ? 'bg-red-200 text-red-600 hover:bg-red-300' : 'bg-red-800 text-red-200 hover:bg-red-700'
              }`}
              title={t('clearCacheButtonTitle')}>
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={goGithubSite}
              className={`rounded p-2 text-sm font-medium shadow-sm hover:opacity-80 ${
                isLight ? 'bg-slate-200 text-slate-800' : 'bg-gray-700 text-gray-100'
              }`}
              title={t('openGitHubButtonTitle')}>
              <img src={`https://cdn.simpleicons.org/github/${githubIconColor}`} alt="GitHub" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <h2 className="text-lg font-semibold">{t('translationSettingsTitle')}</h2>

        <div className="space-y-2">
          <label className="block text-sm font-medium">
            {t('targetLanguageLabel')}
            <select
              value={translationSettings.targetLanguage}
              onChange={e => handleTranslationSettingChange('targetLanguage', e.target.value)}
              className={`mt-1 block w-full rounded-md border ${
                isLight ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-700'
              } px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}>
              {availableLanguages.map(lang => (
                <option key={lang.value} value={lang.value}>
                  {t(lang.labelKey)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-1 block text-sm font-medium">{t('filterCategoriesLabel')}</legend>
          <div className="mt-1 space-y-1">
            {availableFilterOptions.map(option => {
              const labelKey = option.labelKey as keyof typeof enMessages;
              const englishLabel = enMessages[labelKey]?.message || option.id;

              return (
                <label key={option.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={translationSettings.filterOptions.includes(englishLabel)}
                    onChange={handleFilterOptionChange(option.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`ml-2 text-sm ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                    {t(option.labelKey)}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-2">
          <label className="block text-sm font-medium">
            {t('customFilterLabel')}
            <input
              type="text"
              value={translationSettings.customFilter}
              onChange={e => handleTranslationSettingChange('customFilter', e.target.value)}
              className={`mt-1 block w-full rounded-md border ${
                isLight ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-700'
              } px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
              placeholder={t('customFilterPlaceholder')}
            />
          </label>
        </div>

        <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('defaultTranslationNote')}</p>

        <h2 className="${isLight ? 'border-gray-200' : 'border-gray-700'} mt-6 border-t pt-4 text-lg font-semibold">
          {t('apiConfigurationTitle')}
        </h2>

        <div className="space-y-2">
          <label className="block text-sm font-medium">
            {t('apiKeyLabel')}
            <div className="relative mt-1">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={config.apiKey}
                onChange={handleInputChange('apiKey')}
                className={`block w-full rounded-md border ${
                  isLight ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-700'
                } px-3 py-2 pr-10 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                placeholder={t('apiKeyPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className={`absolute inset-y-0 right-0 flex items-center px-3 ${
                  isLight ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-300'
                }`}>
                {showApiKey ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-4 w-4">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-4 w-4">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </label>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">
            {t('apiUrlLabel')}
            <input
              type="text"
              value={config.apiUrl}
              onChange={handleInputChange('apiUrl')}
              className={`mt-1 block w-full rounded-md border ${
                isLight ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-700'
              } px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
              placeholder={t('apiUrlPlaceholder')}
            />
          </label>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">
            {t('modelNameLabel')}
            <input
              type="text"
              value={config.modelName}
              onChange={handleInputChange('modelName')}
              className={`mt-1 block w-full rounded-md border ${
                isLight ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-700'
              } px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
              placeholder={t('modelNamePlaceholder')}
            />
          </label>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">
            {t('requestsPerSecondLabel')}
            <input
              type="number"
              value={config.requestsPerSecond}
              onChange={handleInputChange('requestsPerSecond')}
              min="1"
              max="10"
              className={`mt-1 block w-full rounded-md border ${
                isLight ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-700'
              } px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
            />
          </label>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handleSave}
            className={`rounded-md px-4 py-2 text-sm font-medium shadow-sm ${
              isLight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}>
            {isSaved ? t('saveButtonTextSaved') : t('saveButtonText')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
