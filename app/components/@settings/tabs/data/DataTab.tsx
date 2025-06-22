import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '~/components/ui/Button';
import { ConfirmationDialog, SelectionDialog } from '~/components/ui/Dialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '~/components/ui/Card';
import { SectionHeader } from '~/components/ui/SectionHeader'; // Import new SectionHeader
import { motion } from 'framer-motion';
import { useDataOperations } from '~/lib/hooks/useDataOperations';
import { openDatabase } from '~/lib/persistence/db';
import { getAllChats, type Chat } from '~/lib/persistence/chats';
import { DataVisualization } from './DataVisualization';
import { classNames } from '~/utils/classNames';
import { toast } from 'react-toastify';

// Create a custom hook to connect to the boltHistory database
function useBoltHistoryDB() {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initDB = async () => {
      try {
        setIsLoading(true);
        const database = await openDatabase();
        setDb(database || null);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error initializing database'));
        setIsLoading(false);
      }
    };
    initDB();
    return () => {
      if (db) db.close();
    };
  }, []);
  return { db, isLoading, error };
}

interface ExtendedChat extends Chat {
  title?: string;
  updatedAt?: number;
}

function createChatItem(chat: Chat): ChatItem {
  return {
    id: chat.id,
    label: (chat as ExtendedChat).title || chat.description || `Chat ${chat.id.slice(0, 8)}`,
    description: `${chat.messages.length} messages - Last updated: ${new Date((chat as ExtendedChat).updatedAt || Date.parse(chat.timestamp)).toLocaleString()}`,
  };
}

interface SettingsCategory {
  id: string;
  label: string;
  description: string;
}

interface ChatItem {
  id: string;
  label: string;
  description: string;
}

export function DataTab() {
  const { db, isLoading: dbLoading } = useBoltHistoryDB();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiKeyFileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  const [showResetInlineConfirm, setShowResetInlineConfirm] = useState(false);
  const [showDeleteInlineConfirm, setShowDeleteInlineConfirm] = useState(false);
  const [showSettingsSelection, setShowSettingsSelection] = useState(false);
  const [showChatsSelection, setShowChatsSelection] = useState(false);

  const [settingsCategories] = useState<SettingsCategory[]>([
    { id: 'core', label: 'Core Settings', description: 'User profile and main settings' },
    { id: 'providers', label: 'Providers', description: 'API keys and provider configurations' },
    { id: 'features', label: 'Features', description: 'Feature flags and settings' },
    { id: 'ui', label: 'UI', description: 'UI configuration and preferences' },
    { id: 'connections', label: 'Connections', description: 'External service connections' },
    { id: 'debug', label: 'Debug', description: 'Debug settings and logs' },
    { id: 'updates', label: 'Updates', description: 'Update settings and notifications' },
  ]);

  const [availableChats, setAvailableChats] = useState<ExtendedChat[]>([]);
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);

  const {
    isExporting, isImporting, isResetting, isDownloadingTemplate,
    handleExportSettings, handleExportSelectedSettings, handleExportAllChats,
    handleExportSelectedChats, handleImportSettings, handleImportChats,
    handleResetSettings, handleResetChats, handleDownloadTemplate, handleImportAPIKeys,
  } = useDataOperations({
    customDb: db || undefined,
    onReloadSettings: () => window.location.reload(),
    onReloadChats: () => {
      if (db) {
        getAllChats(db).then((chats) => {
          const extendedChats = chats as ExtendedChat[];
          setAvailableChats(extendedChats);
          setChatItems(extendedChats.map((chat) => createChatItem(chat)));
        });
      }
    },
    onResetSettings: () => setShowResetInlineConfirm(false),
    onResetChats: () => setShowDeleteInlineConfirm(false),
  });

  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportingKeys, setIsImportingKeys] = useState(false);

  useEffect(() => {
    if (db) {
      getAllChats(db)
        .then((chats) => {
          const extendedChats = chats as ExtendedChat[];
          setAvailableChats(extendedChats);
          setChatItems(extendedChats.map((chat) => createChatItem(chat)));
        })
        .catch((error) => {
          toast.error('Failed to load chats: ' + (error instanceof Error ? error.message : 'Unknown error'));
        });
    }
  }, [db]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleImportSettings(file);
  }, [handleImportSettings]);

  const handleAPIKeyFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsImportingKeys(true);
      handleImportAPIKeys(file).finally(() => setIsImportingKeys(false));
    }
  }, [handleImportAPIKeys]);

  const handleChatFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleImportChats(file);
  }, [handleImportChats]);

  const handleResetChatsWithState = useCallback(() => {
    setIsDeleting(true);
    handleResetChats().finally(() => setIsDeleting(false));
  }, [handleResetChats]);

  return (
    <div className="space-y-6 sm:space-y-8 md:space-y-12">
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileInputChange} className="hidden" />
      <input ref={apiKeyFileInputRef} type="file" accept=".json" onChange={handleAPIKeyFileInputChange} className="hidden" />
      <input ref={chatFileInputRef} type="file" accept=".json" onChange={handleChatFileInputChange} className="hidden" />

      <ConfirmationDialog isOpen={showResetInlineConfirm} onClose={() => setShowResetInlineConfirm(false)} title="Reset All Settings?" description="This will reset all your settings to their default values. This action cannot be undone." confirmLabel="Reset Settings" cancelLabel="Cancel" variant="destructive" isLoading={isResetting} onConfirm={handleResetSettings} />
      <ConfirmationDialog isOpen={showDeleteInlineConfirm} onClose={() => setShowDeleteInlineConfirm(false)} title="Delete All Chats?" description="This will permanently delete all your chat history. This action cannot be undone." confirmLabel="Delete All" cancelLabel="Cancel" variant="destructive" isLoading={isDeleting} onConfirm={handleResetChatsWithState} />
      <SelectionDialog isOpen={showSettingsSelection} onClose={() => setShowSettingsSelection(false)} title="Select Settings to Export" items={settingsCategories} onConfirm={(selectedIds) => { handleExportSelectedSettings(selectedIds); setShowSettingsSelection(false); }} confirmLabel="Export Selected" />
      <SelectionDialog isOpen={showChatsSelection} onClose={() => setShowChatsSelection(false)} title="Select Chats to Export" items={chatItems} onConfirm={(selectedIds) => { handleExportSelectedChats(selectedIds); setShowChatsSelection(false); }} confirmLabel="Export Selected" />

      {/* Chats Section */}
      <section>
        <SectionHeader title="Chats" description="Manage your chat history and data." icon="i-ph:chat-circle-dots-duotone" />
        {dbLoading ? (
          <div className="flex items-center justify-center p-3 sm:p-4 text-xs sm:text-sm">
            <div className="i-ph-spinner-gap-bold animate-spin w-5 h-5 sm:w-6 sm:h-6 mr-1.5 sm:mr-2" />
            <span>Loading chats database...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            <Card>
              <CardHeader>
                <CardTitle icon={<motion.div className="text-accent-500" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><div className="i-ph:download-duotone w-4 h-4 sm:w-5 sm:h-5" /></motion.div>}>
                  Export All Chats
                </CardTitle>
                <CardDescription>Export all your chats to a JSON file.</CardDescription>
              </CardHeader>
              <CardFooter>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                  <Button onClick={handleExportAllChats} disabled={isExporting || availableChats.length === 0} variant="outline" size="sm" className={classNames('w-full justify-center', isExporting || availableChats.length === 0 ? 'cursor-not-allowed' : '')} >
                    {isExporting ? (<><div className="i-ph-spinner-gap-bold animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />Exporting...</>) : availableChats.length === 0 ? ('No Chats to Export') : ('Export All')}
                  </Button>
                </motion.div>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle icon={<motion.div className="text-accent-500" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><div className="i-ph:list-checks w-4 h-4 sm:w-5 sm:h-5" /></motion.div>}>
                  Export Selected Chats
                </CardTitle>
                <CardDescription>Choose specific chats to export.</CardDescription>
              </CardHeader>
              <CardFooter>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                  <Button onClick={() => setShowChatsSelection(true)} disabled={isExporting || chatItems.length === 0} variant="outline" size="sm" className={classNames('w-full justify-center', isExporting || chatItems.length === 0 ? 'cursor-not-allowed' : '')}>
                    {isExporting ? (<><div className="i-ph-spinner-gap-bold animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />Exporting...</>) : ('Select Chats')}
                  </Button>
                </motion.div>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle icon={<motion.div className="text-accent-500" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><div className="i-ph:upload-duotone w-4 h-4 sm:w-5 sm:h-5" /></motion.div>}>
                  Import Chats
                </CardTitle>
                <CardDescription>Import chats from a JSON file.</CardDescription>
              </CardHeader>
              <CardFooter>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                  <Button onClick={() => chatFileInputRef.current?.click()} disabled={isImporting} variant="outline" size="sm" className={classNames('w-full justify-center', isImporting ? 'cursor-not-allowed' : '')}>
                    {isImporting ? (<><div className="i-ph-spinner-gap-bold animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />Importing...</>) : ('Import Chats')}
                  </Button>
                </motion.div>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle icon={<motion.div className="text-red-500 dark:text-red-400" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><div className="i-ph:trash-duotone w-4 h-4 sm:w-5 sm:h-5" /></motion.div>}>
                  Delete All Chats
                </CardTitle>
                <CardDescription>Delete all your chat history.</CardDescription>
              </CardHeader>
              <CardFooter>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                  <Button onClick={() => setShowDeleteInlineConfirm(true)} disabled={isDeleting || chatItems.length === 0} variant="outline" size="sm" className={classNames('w-full justify-center', isDeleting || chatItems.length === 0 ? 'cursor-not-allowed' : '')}>
                    {isDeleting ? (<><div className="i-ph-spinner-gap-bold animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />Deleting...</>) : ('Delete All')}
                  </Button>
                </motion.div>
              </CardFooter>
            </Card>
          </div>
        )}
      </section>

      {/* Settings Section */}
      <section>
        <SectionHeader title="Settings" description="Manage application settings and configurations." icon="i-ph:gear-duotone" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
          <Card>
            <CardHeader>
              <CardTitle icon={<motion.div className="text-accent-500" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><div className="i-ph:download-duotone w-4 h-4 sm:w-5 sm:h-5" /></motion.div>}>
                Export All Settings
              </CardTitle>
              <CardDescription>Export all your settings to a JSON file.</CardDescription>
            </CardHeader>
            <CardFooter>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                <Button onClick={handleExportSettings} disabled={isExporting} variant="outline" size="sm" className={classNames('w-full justify-center', isExporting ? 'cursor-not-allowed' : '')}>
                  {isExporting ? (<><div className="i-ph-spinner-gap-bold animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />Exporting...</>) : ('Export All')}
                </Button>
              </motion.div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={<motion.div className="text-accent-500" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><div className="i-ph:filter-duotone w-4 h-4 sm:w-5 sm:h-5" /></motion.div>}>
                Export Selected Settings
              </CardTitle>
              <CardDescription>Choose specific settings to export.</CardDescription>
            </CardHeader>
            <CardFooter>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                <Button onClick={() => setShowSettingsSelection(true)} disabled={isExporting || settingsCategories.length === 0} variant="outline" size="sm" className={classNames('w-full justify-center', isExporting || settingsCategories.length === 0 ? 'cursor-not-allowed' : '')}>
                  {isExporting ? (<><div className="i-ph-spinner-gap-bold animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />Exporting...</>) : ('Select Settings')}
                </Button>
              </motion.div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={<motion.div className="text-accent-500" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><div className="i-ph:upload-duotone w-4 h-4 sm:w-5 sm:h-5" /></motion.div>}>
                Import Settings
              </CardTitle>
              <CardDescription>Import settings from a JSON file.</CardDescription>
            </CardHeader>
            <CardFooter>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                <Button onClick={() => fileInputRef.current?.click()} disabled={isImporting} variant="outline" size="sm" className={classNames('w-full justify-center', isImporting ? 'cursor-not-allowed' : '')}>
                  {isImporting ? (<><div className="i-ph-spinner-gap-bold animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />Importing...</>) : ('Import Settings')}
                </Button>
              </motion.div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={<motion.div className="text-red-500 dark:text-red-400" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><div className="i-ph:arrow-counter-clockwise-duotone w-4 h-4 sm:w-5 sm:h-5" /></motion.div>}>
                Reset All Settings
              </CardTitle>
              <CardDescription>Reset all settings to their default values.</CardDescription>
            </CardHeader>
            <CardFooter>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                <Button onClick={() => setShowResetInlineConfirm(true)} disabled={isResetting} variant="outline" size="sm" className={classNames('w-full justify-center', isResetting ? 'cursor-not-allowed' : '')}>
                  {isResetting ? (<><div className="i-ph-spinner-gap-bold animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />Resetting...</>) : ('Reset All')}
                </Button>
              </motion.div>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* API Keys Section */}
      <section>
        <SectionHeader title="API Keys" description="Manage your API keys for external services." icon="i-ph:key-duotone" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4"> {/* Adjusted to md:grid-cols-2 as there are only 2 cards */}
          <Card>
            <CardHeader>
              <CardTitle icon={<motion.div className="text-accent-500" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><div className="i-ph:file-text-duotone w-4 h-4 sm:w-5 sm:h-5" /></motion.div>}>
                Download Template
              </CardTitle>
              <CardDescription>Download a template file for your API keys.</CardDescription>
            </CardHeader>
            <CardFooter>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                <Button onClick={handleDownloadTemplate} disabled={isDownloadingTemplate} variant="outline" size="sm" className={classNames('w-full justify-center',isDownloadingTemplate ? 'cursor-not-allowed' : '')}>
                  {isDownloadingTemplate ? (<><div className="i-ph-spinner-gap-bold animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />Downloading...</>) : ('Download')}
                </Button>
              </motion.div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={<motion.div className="text-accent-500" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><div className="i-ph:upload-duotone w-4 h-4 sm:w-5 sm:h-5" /></motion.div>}>
                Import API Keys
              </CardTitle>
              <CardDescription>Import API keys from a JSON file.</CardDescription>
            </CardHeader>
            <CardFooter>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                <Button onClick={() => apiKeyFileInputRef.current?.click()} disabled={isImportingKeys} variant="outline" size="sm" className={classNames('w-full justify-center',isImportingKeys ? 'cursor-not-allowed' : '')}>
                  {isImportingKeys ? (<><div className="i-ph-spinner-gap-bold animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />Importing...</>) : ('Import Keys')}
                </Button>
              </motion.div>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Data Visualization */}
      <section>
        <SectionHeader title="Data Usage" description="Visualize your chat data and usage patterns." icon="i-ph:chart-pie-slice-duotone" />
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-5"> {/* Responsive CardContent padding, was p-5 */}
            <DataVisualization chats={availableChats} /> {/* This component will need its own responsive review */}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
