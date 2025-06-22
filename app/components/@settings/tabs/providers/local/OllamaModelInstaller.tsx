import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import { Progress } from '~/components/ui/Progress';
import { useToast } from '~/components/ui/use-toast';
import { useSettings } from '~/lib/hooks/useSettings';
import { SectionHeader } from '~/components/ui/SectionHeader'; // Import SectionHeader

interface OllamaModelInstallerProps {
  onModelInstalled: () => void;
}

interface InstallProgress {
  status: string;
  progress: number;
  downloadedSize?: string;
  totalSize?: string;
  speed?: string;
}

interface ModelInfo {
  name: string;
  desc: string;
  size: string;
  tags: string[];
  installedVersion?: string;
  latestVersion?: string;
  needsUpdate?: boolean;
  status?: 'idle' | 'installing' | 'updating' | 'updated' | 'error';
  details?: {
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

const POPULAR_MODELS: ModelInfo[] = [
  { name: 'deepseek-coder:6.7b', desc: "DeepSeek's code generation model", size: '4.1GB', tags: ['coding', 'popular'] },
  { name: 'llama2:7b', desc: "Meta's Llama 2 (7B parameters)", size: '3.8GB', tags: ['general', 'popular'] },
  { name: 'mistral:7b', desc: "Mistral's 7B model", size: '4.1GB', tags: ['general', 'popular'] },
  { name: 'gemma:7b', desc: "Google's Gemma model", size: '4.0GB', tags: ['general', 'new'] },
  { name: 'codellama:7b', desc: "Meta's Code Llama model", size: '4.1GB', tags: ['coding', 'popular'] },
  { name: 'neural-chat:7b', desc: "Intel's Neural Chat model", size: '4.1GB', tags: ['chat', 'popular'] },
  { name: 'phi:latest', desc: "Microsoft's Phi-2 model", size: '2.7GB', tags: ['small', 'fast'] },
  { name: 'qwen:7b', desc: "Alibaba's Qwen model", size: '4.1GB', tags: ['general'] },
  { name: 'solar:10.7b', desc: "Upstage's Solar model", size: '6.1GB', tags: ['large', 'powerful'] },
  { name: 'openchat:7b', desc: 'Open-source chat model', size: '4.1GB', tags: ['chat', 'popular'] },
  { name: 'dolphin-phi:2.7b', desc: 'Lightweight chat model', size: '1.6GB', tags: ['small', 'fast'] },
  { name: 'stable-code:3b', desc: 'Lightweight coding model', size: '1.8GB', tags: ['coding', 'small'] },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

function OllamaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1024 1024" className={className} fill="currentColor">
      <path d="M684.3 322.2H339.8c-9.5.1-17.7 6.8-19.6 16.1-8.2 41.4-12.4 83.5-12.4 125.7 0 42.2 4.2 84.3 12.4 125.7 1.9 9.3 10.1 16 19.6 16.1h344.5c9.5-.1 17.7-6.8 19.6-16.1 8.2-41.4 12.4-83.5 12.4-125.7 0-42.2-4.2-84.3-12.4-125.7-1.9-9.3-10.1-16-19.6-16.1zM512 640c-176.7 0-320-143.3-320-320S335.3 0 512 0s320 143.3 320 320-143.3 320-320 320z" />
    </svg>
  );
}

export default function OllamaModelInstaller({ onModelInstalled }: OllamaModelInstallerProps) {
  const [modelString, setModelString] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [installProgress, setInstallProgress] = useState<InstallProgress | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [models, setModels] = useState<ModelInfo[]>(POPULAR_MODELS);
  const { toast } = useToast();
  const { providers } = useSettings();

  const baseUrl = providers?.Ollama?.settings?.baseUrl || 'http://127.0.0.1:11434';

  const checkInstalledModels = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/tags`, { method: 'GET' });
      if (!response.ok) throw new Error('Failed to fetch installed models');
      const data = (await response.json()) as { models: Array<{ name: string; digest: string; latest: string }> };
      const installedModels = data.models || [];
      setModels((prevModels) =>
        prevModels.map((model) => {
          const installed = installedModels.find((m) => m.name.toLowerCase() === model.name.toLowerCase());
          if (installed) {
            return { ...model, installedVersion: installed.digest.substring(0, 8), needsUpdate: installed.digest !== installed.latest, latestVersion: installed.latest?.substring(0, 8) };
          }
          return model;
        }),
      );
    } catch (error) { console.error('Error checking installed models:', error); }
  };

  useEffect(() => { checkInstalledModels(); }, [baseUrl]);

  const handleCheckUpdates = async () => {
    setIsChecking(true);
    try {
      await checkInstalledModels();
      toast({ title: 'Model versions checked' });
    } catch (err) {
      toast({ title: 'Failed to check model versions', variant: 'destructive' });
    } finally {
      setIsChecking(false);
    }
  };

  const filteredModels = models.filter((model) => {
    const matchesSearch = searchQuery === '' || model.name.toLowerCase().includes(searchQuery.toLowerCase()) || model.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => model.tags.includes(tag));
    return matchesSearch && matchesTags;
  });

  const handleInstallModel = async (modelToInstall: string) => {
    if (!modelToInstall) return;
    try {
      setIsInstalling(true);
      setInstallProgress({ status: 'Starting download...', progress: 0, downloadedSize: '0 B', totalSize: 'Calculating...', speed: '0 B/s' });
      setModelString(''); setSearchQuery('');

      const response = await fetch(`${baseUrl}/api/pull`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: modelToInstall }) });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to get response reader');

      let lastTime = Date.now(); let lastBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = new TextDecoder().decode(value);
        const lines = text.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if ('status' in data) {
              const currentTime = Date.now();
              const timeDiff = (currentTime - lastTime) / 1000;
              const bytesDiff = (data.completed || 0) - lastBytes;
              const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0; // Avoid division by zero
              setInstallProgress({
                status: data.status,
                progress: data.completed && data.total ? (data.completed / data.total) * 100 : 0,
                downloadedSize: formatBytes(data.completed || 0),
                totalSize: data.total ? formatBytes(data.total) : 'Calculating...',
                speed: formatSpeed(speed),
              });
              lastTime = currentTime; lastBytes = data.completed || 0;
            }
          } catch (err) { console.error('Error parsing progress:', err); }
        }
      }
      toast({ title: 'Successfully installed ' + modelToInstall });
      setTimeout(() => { onModelInstalled(); }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({ title: `Failed to install ${modelToInstall}`, description: errorMessage, variant: 'destructive' });
    } finally {
      setIsInstalling(false); setInstallProgress(null);
    }
  };

  const handleUpdateModel = async (modelToUpdate: string) => {
    try {
      setModels((prev) => prev.map((m) => (m.name === modelToUpdate ? { ...m, status: 'updating' } : m)));
      setInstallProgress({ status: `Updating ${modelToUpdate}...`, progress: 0 });


      const response = await fetch(`${baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelToUpdate }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to get response reader');

      let lastTime = Date.now(); let lastBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = new TextDecoder().decode(value);
        const lines = text.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if ('status' in data) {
              const currentTime = Date.now();
              const timeDiff = (currentTime - lastTime) / 1000;
              const bytesDiff = (data.completed || 0) - lastBytes;
              const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
              setInstallProgress({
                status: data.status,
                progress: data.completed && data.total ? (data.completed / data.total) * 100 : 0,
                downloadedSize: formatBytes(data.completed || 0),
                totalSize: data.total ? formatBytes(data.total) : 'Calculating...',
                speed: formatSpeed(speed),
              });
              lastTime = currentTime; lastBytes = data.completed || 0;
            }
          } catch (err) { console.error('Error parsing progress:', err); }
        }
      }
      toast({ title: 'Successfully updated ' + modelToUpdate });
      await checkInstalledModels();
      setModels((prev) => prev.map((m) => (m.name === modelToUpdate ? { ...m, status: 'updated' } : m)));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({ title: `Failed to update ${modelToUpdate}`, description: errorMessage, variant: 'destructive' });
      setModels((prev) => prev.map((m) => (m.name === modelToUpdate ? { ...m, status: 'error' } : m)));
    } finally {
      setInstallProgress(null);
    }
  };


  const allTags = Array.from(new Set(POPULAR_MODELS.flatMap((model) => model.tags)));

  return (
    <div className="space-y-4 sm:space-y-6"> {/* Responsive space */}
      <SectionHeader
        title="Ollama Models"
        description="Install and manage your Ollama models"
        icon={<OllamaIcon className="w-5 h-5 sm:w-6 sm:h-6" />} // Pass icon as ReactNode
        iconContainerClassName="text-purple-500"
        actions={
          <motion.button
            onClick={handleCheckUpdates}
            disabled={isChecking}
            className={classNames(
              'px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm rounded-md sm:rounded-lg', // Responsive padding, text, rounding
              'bg-purple-500/10 text-purple-500',
              'hover:bg-purple-500/20',
              'transition-all duration-200',
              'flex items-center gap-1.5 sm:gap-2', // Responsive gap
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isChecking ? (
              <div className="i-ph:spinner-gap-bold animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4" /> // Responsive icon
            ) : (
              <div className="i-ph:arrows-clockwise w-3.5 h-3.5 sm:w-4 sm:h-4" /> // Responsive icon
            )}
            Check Updates
          </motion.button>
        }
        className="pt-4 sm:pt-6" // Add top padding
      />

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4"> {/* Responsive layout & gap */}
        <div className="flex-1">
          <div className="space-y-1">
            <input
              type="text"
              className={classNames(
                'w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm', // Responsive padding, rounding, text
                'bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor',
                'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
                'transition-all duration-200',
              )}
              placeholder="Search models or enter custom model name..."
              value={searchQuery || modelString}
              onChange={(e) => { const value = e.target.value; setSearchQuery(value); setModelString(value); }}
              disabled={isInstalling}
            />
            <p className="text-[10px] sm:text-xs text-bolt-elements-textSecondary px-1"> {/* Responsive text */}
              Browse models at{' '}
              <a
                href="https://ollama.com/library"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-500 hover:underline inline-flex items-center gap-0.5 text-xs sm:text-base font-medium" // Responsive text & gap
              >
                ollama.com/library
                <div className="i-ph:arrow-square-out text-[10px] sm:text-sm" /> {/* Responsive icon */}
              </a>{' '}
              and copy model names to install
            </p>
          </div>
        </div>
        <motion.button
          onClick={() => handleInstallModel(modelString)}
          disabled={!modelString || isInstalling}
          className={classNames(
            'rounded-md sm:rounded-lg px-3 py-2 sm:px-4 text-xs sm:text-sm', // Responsive padding, rounding, text
            'bg-purple-500 text-white',
            'hover:bg-purple-600',
            'transition-all duration-200',
            'flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2', // Responsive gap & justification
            { 'opacity-50 cursor-not-allowed': !modelString || isInstalling },
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isInstalling ? (
            <div className="flex items-center gap-1.5 sm:gap-2"> {/* Responsive gap */}
              <div className="i-ph:spinner-gap-bold animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4" /> {/* Responsive icon */}
              <span>Installing...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2"> {/* Responsive gap */}
              <OllamaIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {/* Responsive icon */}
              <span>Install Model</span>
            </div>
          )}
        </motion.button>
      </div>

      <div className="flex flex-wrap gap-1.5 sm:gap-2"> {/* Responsive gap */}
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => {
              setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
            }}
            className={classNames(
              'px-2 py-1 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium transition-all duration-200', // Responsive padding & text
              selectedTags.includes(tag)
                ? 'bg-purple-500 text-white'
                : 'bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-4',
            )}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-1.5 sm:gap-2"> {/* Responsive gap */}
        {filteredModels.map((model) => (
          <motion.div
            key={model.name}
            className={classNames(
              'flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2.5 sm:p-3 rounded-lg sm:rounded-xl', // Responsive padding, rounding, layout, gap
              'bg-bolt-elements-background-depth-3',
              'hover:bg-bolt-elements-background-depth-4',
              'transition-all duration-200',
              'relative group',
            )}
          >
            <OllamaIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 mt-0.5 flex-shrink-0" /> {/* Responsive icon */}
            <div className="flex-1 space-y-1 sm:space-y-1.5"> {/* Responsive space */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between"> {/* Responsive layout */}
                <div>
                  <p className="text-bolt-elements-textPrimary font-mono text-xs sm:text-sm">{model.name}</p> {/* Responsive text */}
                  <p className="text-[10px] sm:text-xs text-bolt-elements-textSecondary mt-0.5">{model.desc}</p> {/* Responsive text */}
                </div>
                <div className="text-right mt-1 sm:mt-0">
                  <span className="text-[10px] sm:text-xs text-bolt-elements-textTertiary">{model.size}</span> {/* Responsive text */}
                  {model.installedVersion && (
                    <div className="mt-0.5 flex flex-col items-end gap-0.5">
                      <span className="text-[10px] sm:text-xs text-bolt-elements-textTertiary">v{model.installedVersion}</span> {/* Responsive text */}
                      {model.needsUpdate && model.latestVersion && (
                        <span className="text-[10px] sm:text-xs text-purple-500">v{model.latestVersion} available</span> /* Responsive text */
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"> {/* Responsive layout & gap */}
                <div className="flex flex-wrap gap-1">
                  {model.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] bg-bolt-elements-background-depth-4 text-bolt-elements-textTertiary" // Responsive padding & text
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 self-start sm:self-center"> {/* Alignment for buttons */}
                  {model.installedVersion ? (
                    model.needsUpdate ? (
                      <motion.button
                        onClick={() => handleUpdateModel(model.name)}
                        className={classNames(
                          'px-1.5 py-0.5 sm:px-2 rounded-md sm:rounded-lg text-[10px] sm:text-xs', // Responsive padding, rounding, text
                          'bg-purple-500 text-white',
                          'hover:bg-purple-600',
                          'transition-all duration-200',
                          'flex items-center gap-1',
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="i-ph:arrows-clockwise text-xs sm:text-sm" /> {/* Responsive icon */}
                        Update
                      </motion.button>
                    ) : (
                      <span className="px-1.5 sm:px-2 py-0.5 rounded-lg text-[10px] sm:text-xs text-green-500 bg-green-500/10">Up to date</span> // Responsive padding & text
                    )
                  ) : (
                    <motion.button
                      onClick={() => handleInstallModel(model.name)}
                      className={classNames(
                        'px-1.5 py-0.5 sm:px-2 rounded-md sm:rounded-lg text-[10px] sm:text-xs',
                        'bg-purple-500 text-white',
                        'hover:bg-purple-600',
                        'transition-all duration-200',
                        'flex items-center gap-1',
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="i-ph:download text-xs sm:text-sm" />
                      Install
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {installProgress && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5 sm:space-y-2"> {/* Responsive space */}
          <div className="flex justify-between text-xs sm:text-sm"> {/* Responsive text */}
            <span className="text-bolt-elements-textSecondary">{installProgress.status}</span>
            <div className="flex items-center gap-2 sm:gap-4"> {/* Responsive gap */}
              <span className="text-bolt-elements-textTertiary">
                {installProgress.downloadedSize} / {installProgress.totalSize}
              </span>
              <span className="text-bolt-elements-textTertiary">{installProgress.speed}</span>
              <span className="text-bolt-elements-textSecondary">{Math.round(installProgress.progress)}%</span>
            </div>
          </div>
          <Progress value={installProgress.progress} className="h-1 sm:h-1.5" /> {/* Responsive height */}
        </motion.div>
      )}
    </div>
  );
}

// Helper component for model status badge
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

  if (!config) {
    return null;
  }

  return (
    <span className={classNames('px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-medium', config.bg, config.text)}> {/* Responsive padding & text */}
      {config.label}
    </span>
  );
}
