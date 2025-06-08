import '@src/Popup.css';
import { PROJECT_URL_OBJECT, useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
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
  { id: 'names', label: 'Names (People, Places)' },
  { id: 'animals', label: 'Animals' },
  { id: 'science', label: 'Science (Physics, Chemistry, Biology)' },
  { id: 'medical', label: 'Medical (Diseases)' },
  { id: 'humanities', label: 'Humanities (Astronomy, History, Philosophy, Psychology)' },
  { id: 'vegetables', label: 'Vegetables, Fruits' },
];

const availableLanguages = [
  { value: 'Chinese', label: '中文 (Chinese)' },
  { value: 'English', label: '英文 (English)' },
  { value: 'Japanese', label: '日文 (Japanese)' },
  { value: 'Korean', label: '韩文 (Korean)' },
  { value: 'French', label: '法文 (French)' },
  { value: 'German', label: '德文 (German)' },
  { value: 'Spanish', label: '西班牙文 (Spanish)' },
];

const Popup = () => {
  const [config, setConfig] = useState<ModelConfig>(defaultConfig);
  const [translationSettings, setTranslationSettings] = useState<TranslationSettings>(defaultTranslationSettings);
  const [isSaved, setIsSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const { isLight } = useStorage(exampleThemeStorage);
  const goGithubSite = () => chrome.tabs.create(PROJECT_URL_OBJECT);
  const githubIconColor = isLight ? '334155' : 'f3f4f6';

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

  const handleClearCache = () => {
    if (window.confirm('您确定要清除翻译缓存吗？此操作无法撤销。')) {
      chrome.storage.local.remove('translationCache', () => {
        toast.success('缓存已成功清除！');
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
    let newFilters;
    if (e.target.checked) {
      newFilters = [...currentFilters, optionId];
    } else {
      newFilters = currentFilters.filter(id => id !== optionId);
    }
    handleTranslationSettingChange('filterOptions', newFilters);
  };

  return (
    <div className={`App min-w-[400px] p-5 ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
      <Toaster position="top-center" reverseOrder={false} />
      <div className={`space-y-4 ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Settings</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleClearCache}
              className={`rounded p-2 text-sm font-medium shadow-sm hover:opacity-80 ${
                isLight ? 'bg-red-200 text-red-600 hover:bg-red-300' : 'bg-red-800 text-red-200 hover:bg-red-700'
              }`}
              title="Clear local translation cache">
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={goGithubSite}
              className={`rounded p-2 text-sm font-medium shadow-sm hover:opacity-80 ${
                isLight ? 'bg-slate-200 text-slate-800' : 'bg-gray-700 text-gray-100'
              }`}
              title="Open GitHub repository">
              <img src={`https://cdn.simpleicons.org/github/${githubIconColor}`} alt="GitHub" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <h2 className="text-lg font-semibold">Translation Settings</h2>

        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Target Language for Filtered Content
            <select
              value={translationSettings.targetLanguage}
              onChange={e => handleTranslationSettingChange('targetLanguage', e.target.value)}
              className={`mt-1 block w-full rounded-md border ${
                isLight ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-700'
              } px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}>
              {availableLanguages.map(lang => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-1 block text-sm font-medium">
            Filter Content Categories (Translate to Target Language)
          </legend>
          <div className="mt-1 space-y-1">
            {availableFilterOptions.map(option => (
              <label key={option.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={translationSettings.filterOptions.includes(option.id)}
                  onChange={handleFilterOptionChange(option.id)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={`ml-2 text-sm ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Custom Filter Keywords (comma-separated, translate to Target Language)
            <input
              type="text"
              value={translationSettings.customFilter}
              onChange={e => handleTranslationSettingChange('customFilter', e.target.value)}
              className={`mt-1 block w-full rounded-md border ${
                isLight ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-700'
              } px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
              placeholder="e.g., product, company, brand"
            />
          </label>
        </div>

        <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
          Content not matching any filters will be translated to English by default.
        </p>

        <h2 className="${isLight ? 'border-gray-200' : 'border-gray-700'} mt-6 border-t pt-4 text-lg font-semibold">
          API Configuration
        </h2>

        <div className="space-y-2">
          <label className="block text-sm font-medium">
            API Key
            <div className="relative mt-1">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={config.apiKey}
                onChange={handleInputChange('apiKey')}
                className={`block w-full rounded-md border ${
                  isLight ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-700'
                } px-3 py-2 pr-10 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                placeholder="Enter API Key"
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
            API URL
            <input
              type="text"
              value={config.apiUrl}
              onChange={handleInputChange('apiUrl')}
              className={`mt-1 block w-full rounded-md border ${
                isLight ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-700'
              } px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
              placeholder="Enter API URL"
            />
          </label>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Model Name
            <input
              type="text"
              value={config.modelName}
              onChange={handleInputChange('modelName')}
              className={`mt-1 block w-full rounded-md border ${
                isLight ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-700'
              } px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
              placeholder="Enter model name"
            />
          </label>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Requests per Second
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
            {isSaved ? 'Saved!' : 'Settings Saved!'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
