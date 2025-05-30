import '@src/Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { useState, useEffect } from 'react';

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

const Popup = () => {
  const [config, setConfig] = useState<ModelConfig>(defaultConfig);
  const [isSaved, setIsSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const { isLight } = useStorage(exampleThemeStorage);

  useEffect(() => {
    // Load saved config from storage
    chrome.storage.local.get(['modelConfig'], result => {
      if (result.modelConfig) {
        setConfig(result.modelConfig);
      }
    });
  }, []);

  const handleSave = () => {
    chrome.storage.local.set({ modelConfig: config }, () => {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    });
  };

  const handleInputChange = (field: keyof ModelConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'requestsPerSecond' ? parseInt(e.target.value) || 0 : e.target.value;
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className={`App min-w-[300px] p-4 ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
      <div className={`space-y-4 ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        <h1 className="mb-4 text-xl font-bold">Settings</h1>

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
            {isSaved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
