import React, { useEffect, useState, useCallback, useRef } from 'react'; // Added useRef
import { Switch } from '~/components/ui/Switch';
import { useSettings } from '~/lib/hooks/useSettings';
import { LOCAL_PROVIDERS, URL_CONFIGURABLE_PROVIDERS } from '~/lib/stores/settings';
import type { IProviderConfig } from '~/types/model';
import { logStore } from '~/lib/stores/logs';
import { motion, AnimatePresence } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import { BsRobot } from 'react-icons/bs';
import type { IconType } from 'react-icons';
import { BiChip } from 'react-icons/bi';
import { TbBrandOpenai } from 'react-icons/tb';
import { providerBaseUrlEnvKeys } from '~/utils/constants';
import { useToast } from '~/components/ui/use-toast';
import { Progress } from '~/components/ui/Progress';
import OllamaModelInstaller from './OllamaModelInstaller';
import { useAsyncDataFetcher } from '~/lib/hooks/useAsyncDataFetcher';
import { SectionHeader } from '~/components/ui/SectionHeader';
import { ScrollArea } from '~/components/ui/ScrollArea'; // Added ScrollArea
import { useVirtualizer } from '@tanstack/react-virtual'; // Added useVirtualizer

// Add type for provider names to ensure type safety
type ProviderName = 'Ollama' | 'LMStudio' | 'OpenAILike';

// Update the PROVIDER_ICONS type to use the ProviderName type
const PROVIDER_ICONS: Record<ProviderName, IconType> = {
  Ollama: BsRobot,
  LMStudio: BsRobot,
  OpenAILike: TbBrandOpenai,
};

// Update PROVIDER_DESCRIPTIONS to use the same type
const PROVIDER_DESCRIPTIONS: Record<ProviderName, string> = {
  Ollama: 'Run open-source models locally on your machine',
  LMStudio: 'Local model inference with LM Studio',
  OpenAILike: 'Connect to OpenAI-compatible API endpoints',
};

// Add a constant for the Ollama API base URL
const OLLAMA_API_URL = 'http://127.0.0.1:11434';

interface OllamaModel {
  name: string;
  digest: string;
  size: number;
  modified_at: string;
  details?: {
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
  status?: 'idle' | 'updating' | 'updated' | 'error' | 'checking';
  error?: string;
  newDigest?: string;
  progress?: {
    current: number;
    total: number;
    status: string;
  };
}

interface OllamaPullResponse {
  status: string;
  completed?: number;
  total?: number;
  digest?: string;
}

const isOllamaPullResponse = (data: unknown): data is OllamaPullResponse => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'status' in data &&
    typeof (data as OllamaPullResponse).status === 'string'
  );
};

const doFetchOllamaModels = async (): Promise<OllamaModel[]> => {
  const response = await fetch('http://127.0.0.1:11434/api/tags');
  if (!response.ok) {
    // Attempt to parse error from Ollama if possible
    try {
      const errorData = await response.json();
      if (errorData && errorData.error) {
        throw new Error(`Ollama API Error: ${errorData.error}`);
      }
    } catch (parseError) {
      // Ignore parsing error, throw original HTTP error
    }
    throw new Error(`Failed to fetch Ollama models: ${response.statusText} (${response.status})`);
  }
  const data = (await response.json()) as { models: OllamaModel[] };
  return data.models.map((model) => ({ ...model, status: 'idle' as const }));
};


export default function LocalProvidersTab() {
  const { providers, updateProviderSettings } = useSettings();
  const [filteredProviders, setFilteredProviders] = useState<IProviderConfig[]>([]);
  const [categoryEnabled, setCategoryEnabled] = useState(false);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const { toast } = useToast();

  const parentScrollRef = useRef<HTMLDivElement>(null);


  const {
    data: ollamaModelsData,
    isLoading: isLoadingModels,
    fetchData: fetchOllamaModels,
    setData: setOllamaModels,
    error: ollamaModelsError,
  } = useAsyncDataFetcher<OllamaModel[]>({
    fetchFn: doFetchOllamaModels,
    initialData: [],
    autoFetch: false,
    errorMessagePrefix: 'Error fetching Ollama models',
  });

  const ollamaModels = ollamaModelsData || [];


  // Effect to filter and sort providers
  useEffect(() => {
    const newFilteredProviders = Object.entries(providers || {})
      .filter(([key]) => [...LOCAL_PROVIDERS, 'OpenAILike'].includes(key))
      .map(([key, value]) => {
        const provider = value as IProviderConfig;
        const envKey = providerBaseUrlEnvKeys[key]?.baseUrlKey;
        const envUrl = envKey ? (import.meta.env[envKey] as string | undefined) : undefined;

        if (envUrl && !provider.settings.baseUrl) {
          updateProviderSettings(key, {
            ...provider.settings,
            baseUrl: envUrl,
          });
        }

        return {
          name: key,
          settings: {
            ...provider.settings,
            baseUrl: provider.settings.baseUrl || envUrl,
          },
          staticModels: provider.staticModels || [],
          getDynamicModels: provider.getDynamicModels,
          getApiKeyLink: provider.getApiKeyLink,
          labelForGetApiKey: provider.labelForGetApiKey,
          icon: provider.icon,
        } as IProviderConfig;
      });

    const sorted = newFilteredProviders.sort((a, b) => {
      if (a.name === 'LMStudio') return -1;
      if (b.name === 'LMStudio') return 1;
      if (a.name === 'OpenAILike') return 1;
      if (b.name === 'OpenAILike') return -1;
      return a.name.localeCompare(b.name);
    });
    setFilteredProviders(sorted);
  }, [providers, updateProviderSettings]);

  useEffect(() => {
    const newCategoryState = filteredProviders.every((p) => p.settings.enabled);
    setCategoryEnabled(newCategoryState);
  }, [filteredProviders]);

  useEffect(() => {
    const ollamaProvider = filteredProviders.find((p) => p.name === 'Ollama');
    if (ollamaProvider?.settings.enabled) {
      fetchOllamaModels();
    } else {
      setOllamaModels([]); // Clear models if Ollama is not enabled
    }
  }, [filteredProviders, fetchOllamaModels, setOllamaModels]);


  const updateOllamaModel = async (modelName: string): Promise<boolean> => {
    try {
      const response = await fetch(`${OLLAMA_API_URL}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update ${modelName}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response reader available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = new TextDecoder().decode(value);
        const lines = text.split('\n').filter(Boolean);

        for (const line of lines) {
          const rawData = JSON.parse(line);
          if (!isOllamaPullResponse(rawData)) {
            console.error('Invalid response format:', rawData);
            continue;
          }
          setOllamaModels((current) =>
            (current || []).map((m) =>
              m.name === modelName
                ? {
                    ...m,
                    progress: {
                      current: rawData.completed || 0,
                      total: rawData.total || 0,
                      status: rawData.status,
                    },
                    newDigest: rawData.digest,
                  }
                : m,
            ),
          );
        }
      }
      await fetchOllamaModels();
      return true;
    } catch (error) {
      console.error(`Error updating ${modelName}:`, error);
      setOllamaModels(current => (current || []).map(m => m.name === modelName ? {...m, status: 'error', error: (error as Error).message, progress: undefined } : m));
      return false;
    }
  };

  const handleToggleCategory = useCallback(
    async (enabled: boolean) => {
      filteredProviders.forEach((provider) => {
        updateProviderSettings(provider.name, { ...provider.settings, enabled });
      });
      toast(enabled ? 'All local providers enabled' : 'All local providers disabled');
    },
    [filteredProviders, updateProviderSettings, toast],
  );

  const handleToggleProvider = (provider: IProviderConfig, enabled: boolean) => {
    updateProviderSettings(provider.name, {
      ...provider.settings,
      enabled,
    });

    if (enabled) {
      logStore.logProvider(`Provider ${provider.name} enabled`, { provider: provider.name });
      toast(`${provider.name} enabled`);
      if (provider.name === 'Ollama') fetchOllamaModels();
    } else {
      logStore.logProvider(`Provider ${provider.name} disabled`, { provider: provider.name });
      toast(`${provider.name} disabled`);
      if (provider.name === 'Ollama') setOllamaModels([]);
    }
  };

  const handleUpdateBaseUrl = (provider: IProviderConfig, newBaseUrl: string) => {
    updateProviderSettings(provider.name, {
      ...provider.settings,
      baseUrl: newBaseUrl.trim() || undefined,
    });
    toast(`${provider.name} base URL updated`);
    setEditingProvider(null);
  };

  const handleUpdateOllamaModel = async (modelName: string) => {
     setOllamaModels(current => (current || []).map(m => m.name === modelName ? {...m, status: 'updating', progress: {current: 0, total:1, status: 'starting...'}} : m));
    const updateSuccess = await updateOllamaModel(modelName);
    if (updateSuccess) {
      toast(`Updated ${modelName}`);
      setOllamaModels(current => (current || []).map(m => m.name === modelName ? {...m, status: 'updated', progress: undefined} : m));
    } else {
      toast(`Failed to update ${modelName}`);
       setOllamaModels(current => (current || []).map(m => m.name === modelName ? {...m, status: 'error', progress: undefined} : m));
    }
  };

  const handleDeleteOllamaModel = async (modelName: string) => {
    try {
      const response = await fetch(`${OLLAMA_API_URL}/api/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Failed to delete ${modelName}` }));
        throw new Error(errorData.error || `Failed to delete ${modelName}`);
      }

      setOllamaModels((current) => (current || []).filter((m) => m.name !== modelName));
      toast(`Deleted ${modelName}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error(`Error deleting ${modelName}:`, errorMessage);
      toast(`Failed to delete ${modelName}: ${errorMessage}`);
    }
  };

  const ModelDetails = ({ model }: { model: OllamaModel }) => (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-bolt-elements-textSecondary">
      <div className="flex items-center gap-1">
        <div className="i-ph:code text-purple-500" />
        <span>{model.digest.substring(0, 7)}</span>
      </div>
      {model.details && (
        <>
          <div className="flex items-center gap-1">
            <div className="i-ph:database text-purple-500" />
            <span>{model.details.parameter_size}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="i-ph:cube text-purple-500" />
            <span>{model.details.quantization_level}</span>
          </div>
        </>
      )}
    </div>
  );

  const ModelActions = ({
    model,
    onUpdate,
    onDelete,
  }: {
    model: OllamaModel;
    onUpdate: () => void;
    onDelete: () => void;
  }) => (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <motion.button
        onClick={onUpdate}
        disabled={model.status === 'updating'}
        className={classNames(
          'rounded-md sm:rounded-lg p-1.5 sm:p-2',
          'bg-purple-500/10 text-purple-500',
          'hover:bg-purple-500/20',
          'transition-all duration-200',
          { 'opacity-50 cursor-not-allowed': model.status === 'updating' },
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Update model"
      >
        {model.status === 'updating' ? (
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="i-ph:spinner-gap-bold animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Updating...</span>
          </div>
        ) : (
          <div className="i-ph:arrows-clockwise text-base sm:text-lg" />
        )}
      </motion.button>
      <motion.button
        onClick={onDelete}
        disabled={model.status === 'updating'}
        className={classNames(
          'rounded-md sm:rounded-lg p-1.5 sm:p-2',
          'bg-red-500/10 text-red-500',
          'hover:bg-red-500/20',
          'transition-all duration-200',
          { 'opacity-50 cursor-not-allowed': model.status === 'updating' },
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Delete model"
      >
        <div className="i-ph:trash text-base sm:text-lg" />
      </motion.button>
    </div>
  );

  const rowVirtualizer = useVirtualizer({
    count: ollamaModels.length,
    getScrollElement: () => parentScrollRef.current,
    estimateSize: useCallback(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? 80 : 96), []), // Approx 80px for small, 96px for sm+
    overscan: 5,
  });


  return (
    <div
      className={classNames(
        'rounded-lg bg-bolt-elements-background text-bolt-elements-textPrimary shadow-sm p-3 sm:p-4',
        'hover:bg-bolt-elements-background-depth-2',
        'transition-all duration-200',
      )}
      role="region"
      aria-label="Local Providers Configuration"
    >
      <motion.div
        className="space-y-4 sm:space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <SectionHeader
            title="Local AI Models"
            description="Configure and manage your local AI providers"
            icon={<BiChip className="w-5 h-5 sm:w-6 sm:h-6" />}
            iconContainerClassName="bg-purple-500/10 text-purple-500"
            actions={
                <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2">
                    <span className="text-xs sm:text-sm text-bolt-elements-textSecondary">Enable All</span>
                    <Switch
                    checked={categoryEnabled}
                    onCheckedChange={handleToggleCategory}
                    aria-label="Toggle all local providers"
                    />
                </div>
            }
            className="border-b border-bolt-elements-borderColor pb-3 sm:pb-4 mb-0"
        />

        {/* Ollama Section */}
        {filteredProviders
          .filter((provider) => provider.name === 'Ollama')
          .map((provider) => (
            <motion.div
              key={provider.name}
              className={classNames(
                'bg-bolt-elements-background-depth-2 rounded-lg sm:rounded-xl',
                'hover:bg-bolt-elements-background-depth-3',
                'transition-all duration-200 p-3 sm:p-4 md:p-5',
                'relative overflow-hidden group',
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3 sm:gap-4">
                  <motion.div
                    className={classNames(
                      'w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg sm:rounded-xl',
                      'bg-bolt-elements-background-depth-3',
                      provider.settings.enabled ? 'text-purple-500' : 'text-bolt-elements-textSecondary',
                    )}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    {React.createElement(PROVIDER_ICONS[provider.name as ProviderName] || BsRobot, {
                      className: 'w-6 h-6 sm:w-7 sm:h-7',
                      'aria-label': `${provider.name} icon`,
                    })}
                  </motion.div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <h3 className="text-sm sm:text-md font-semibold text-bolt-elements-textPrimary">{provider.name}</h3>
                      <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-xs rounded-full bg-green-500/10 text-green-500">Local</span>
                    </div>
                    <p className="text-xs sm:text-sm text-bolt-elements-textSecondary mt-0.5 sm:mt-1">
                      {PROVIDER_DESCRIPTIONS[provider.name as ProviderName]}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={provider.settings.enabled}
                  onCheckedChange={(checked) => handleToggleProvider(provider, checked)}
                  aria-label={`Toggle ${provider.name} provider`}
                  className="self-start sm:self-center mt-1 sm:mt-0"
                />
              </div>

              <AnimatePresence>
                {provider.settings.enabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 sm:mt-4"
                  >
                    <div className="flex flex-col gap-1.5 sm:gap-2">
                      <label className="text-xs sm:text-sm text-bolt-elements-textSecondary">API Endpoint</label>
                      {editingProvider === provider.name ? (
                        <input
                          type="text"
                          defaultValue={provider.settings.baseUrl || OLLAMA_API_URL}
                          placeholder="Enter Ollama base URL"
                          className={classNames(
                            'w-full px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm',
                            'bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor',
                            'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                            'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
                            'transition-all duration-200',
                          )}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateBaseUrl(provider, e.currentTarget.value);
                            } else if (e.key === 'Escape') {
                              setEditingProvider(null);
                            }
                          }}
                          onBlur={(e) => handleUpdateBaseUrl(provider, e.target.value)}
                          autoFocus
                        />
                      ) : (
                        <div
                          onClick={() => setEditingProvider(provider.name)}
                          className={classNames(
                            'w-full px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm cursor-pointer',
                            'bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor',
                            'hover:border-purple-500/30 hover:bg-bolt-elements-background-depth-4',
                            'transition-all duration-200',
                          )}
                        >
                          <div className="flex items-center gap-1.5 sm:gap-2 text-bolt-elements-textSecondary">
                            <div className="i-ph:link text-xs sm:text-sm" />
                            <span className="truncate">{provider.settings.baseUrl || OLLAMA_API_URL}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {provider.settings.enabled && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="i-ph:cube-duotone text-purple-500 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <h4 className="text-xs sm:text-sm font-medium text-bolt-elements-textPrimary">Installed Models</h4>
                    </div>
                    {isLoadingModels && !ollamaModelsError && ( // Show loading only if no error
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="i-ph:spinner-gap-bold animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="text-xs sm:text-sm text-bolt-elements-textSecondary">Loading models...</span>
                      </div>
                    )}
                     {!isLoadingModels && !ollamaModelsError && (
                        <span className="text-xs sm:text-sm text-bolt-elements-textSecondary">
                          {ollamaModels.length} models available
                        </span>
                      )}
                      {ollamaModelsError && (
                        <span className="text-xs sm:text-sm text-red-500">Failed to load models</span>
                      )}
                  </div>

                  <ScrollArea className="h-[250px] sm:h-[300px] pr-1" ref={parentScrollRef}> {/* Added ScrollArea with defined height */}
                    <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                      {isLoadingModels && !ollamaModelsError ? (
                        <div className="space-y-2 sm:space-y-3 pt-2">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-16 sm:h-20 w-full bg-bolt-elements-background-depth-3 rounded-lg animate-pulse" />
                          ))}
                        </div>
                      ) : ollamaModels.length === 0 ? (
                        <div className="text-center py-6 sm:py-8 text-bolt-elements-textSecondary">
                          <div className="i-ph:cube-transparent text-3xl sm:text-4xl mx-auto mb-1.5 sm:mb-2" />
                          <p className="text-xs sm:text-sm">{ollamaModelsError ? 'Could not connect to Ollama' : 'No models installed yet'}</p>
                          {!ollamaModelsError &&
                            <p className="text-[10px] sm:text-xs text-bolt-elements-textTertiary px-1">
                              Browse models at{' '}
                              <a href="https://ollama.com/library" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline inline-flex items-center gap-0.5 text-xs sm:text-sm font-medium">
                                ollama.com/library
                                <div className="i-ph:arrow-square-out text-[10px] sm:text-xs" />
                              </a>{' '}
                              and copy model names to install
                            </p>
                          }
                        </div>
                      ) : (
                        rowVirtualizer.getVirtualItems().map((virtualItem) => {
                          const model = ollamaModels[virtualItem.index];
                          if (!model) return null;
                          return (
                            <motion.div
                              key={model.name}
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${virtualItem.size}px`, transform: `translateY(${virtualItem.start}px)`}}
                              className={classNames(
                                'p-3 sm:p-4 rounded-lg sm:rounded-xl',
                                'bg-bolt-elements-background-depth-3',
                                'hover:bg-bolt-elements-background-depth-4',
                                'transition-all duration-200 mb-2 sm:mb-3', // Added bottom margin for spacing
                              )}
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="space-y-1.5 sm:space-y-2">
                                  <div className="flex items-center gap-1.5 sm:gap-2">
                                    <h5 className="text-xs sm:text-sm font-medium text-bolt-elements-textPrimary">{model.name}</h5>
                                    <ModelStatusBadge status={model.status} />
                                  </div>
                                  <ModelDetails model={model} />
                                </div>
                                <ModelActions model={model} onUpdate={() => handleUpdateOllamaModel(model.name)} onDelete={() => { if (window.confirm(`Are you sure you want to delete ${model.name}?`)) handleDeleteOllamaModel(model.name); }} />
                              </div>
                              {model.progress && (
                                <div className="mt-2 sm:mt-3">
                                  <Progress value={Math.round((model.progress.current / model.progress.total) * 100)} className="h-1 sm:h-1.5" />
                                  <div className="flex justify-between mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-bolt-elements-textSecondary">
                                    <span>{model.progress.status}</span>
                                    <span>{Math.round((model.progress.current / model.progress.total) * 100)}%</span>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                  <OllamaModelInstaller onModelInstalled={fetchOllamaModels} />
                </motion.div>
              )}
            </motion.div>
          ))}

        {/* Other Providers Section */}
        <div className="border-t border-bolt-elements-borderColor pt-4 sm:pt-6 mt-6 sm:mt-8">
          <h3 className="text-base sm:text-lg font-semibold text-bolt-elements-textPrimary mb-3 sm:mb-4">Other Local Providers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {filteredProviders
              .filter((provider) => provider.name !== 'Ollama')
              .map((provider, index) => (
                <motion.div
                  key={provider.name}
                  className={classNames(
                    'bg-bolt-elements-background-depth-2 rounded-lg sm:rounded-xl',
                    'hover:bg-bolt-elements-background-depth-3',
                    'transition-all duration-200 p-3 sm:p-4 md:p-5',
                    'relative overflow-hidden group',
                  )}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <motion.div
                        className={classNames(
                          'w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg sm:rounded-xl',
                          'bg-bolt-elements-background-depth-3',
                          provider.settings.enabled ? 'text-purple-500' : 'text-bolt-elements-textSecondary',
                        )}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                      >
                        {React.createElement(PROVIDER_ICONS[provider.name as ProviderName] || BsRobot, {
                          className: 'w-6 h-6 sm:w-7 sm:h-7',
                          'aria-label': `${provider.name} icon`,
                        })}
                      </motion.div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <h3 className="text-sm sm:text-md font-semibold text-bolt-elements-textPrimary">{provider.name}</h3>
                          <div className="flex flex-wrap gap-1">
                            <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-xs rounded-full bg-green-500/10 text-green-500">
                              Local
                            </span>
                            {URL_CONFIGURABLE_PROVIDERS.includes(provider.name) && (
                              <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-xs rounded-full bg-purple-500/10 text-purple-500">
                                Configurable
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-bolt-elements-textSecondary mt-0.5 sm:mt-1">
                          {PROVIDER_DESCRIPTIONS[provider.name as ProviderName]}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={provider.settings.enabled}
                      onCheckedChange={(checked) => handleToggleProvider(provider, checked)}
                      aria-label={`Toggle ${provider.name} provider`}
                      className="self-start sm:self-center mt-1 sm:mt-0"
                    />
                  </div>

                  <AnimatePresence>
                    {provider.settings.enabled && URL_CONFIGURABLE_PROVIDERS.includes(provider.name) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 sm:mt-4"
                      >
                        <div className="flex flex-col gap-1.5 sm:gap-2">
                          <label className="text-xs sm:text-sm text-bolt-elements-textSecondary">API Endpoint</label>
                          {editingProvider === provider.name ? (
                            <input
                              type="text"
                              defaultValue={provider.settings.baseUrl}
                              placeholder={`Enter ${provider.name} base URL`}
                              className={classNames(
                                'w-full px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm',
                                'bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor',
                                'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                                'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
                                'transition-all duration-200',
                              )}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateBaseUrl(provider, e.currentTarget.value);
                                } else if (e.key === 'Escape') {
                                  setEditingProvider(null);
                                }
                              }}
                              onBlur={(e) => handleUpdateBaseUrl(provider, e.target.value)}
                              autoFocus
                            />
                          ) : (
                            <div
                              onClick={() => setEditingProvider(provider.name)}
                              className={classNames(
                                'w-full px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm cursor-pointer',
                                'bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor',
                                'hover:border-purple-500/30 hover:bg-bolt-elements-background-depth-4',
                                'transition-all duration-200',
                              )}
                            >
                              <div className="flex items-center gap-1.5 sm:gap-2 text-bolt-elements-textSecondary">
                                <div className="i-ph:link text-xs sm:text-sm" />
                                <span className="truncate">{provider.settings.baseUrl || 'Click to set base URL'}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ModelStatusBadge({ status }: { status?: string }) {
  if (!status || status === 'idle') {
    return null;
  }
  const statusConfig = {
    updating: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', label: 'Updating' },
    updated: { bg: 'bg-green-500/10', text: 'text-green-500', label: 'Updated' },
    error: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'Error' },
  };
  const config = statusConfig[status as keyof typeof statusConfig];
  if (!config) return null;
  return (
    <span className={classNames('px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-medium', config.bg, config.text)}>
      {config.label}
    </span>
  );
}
