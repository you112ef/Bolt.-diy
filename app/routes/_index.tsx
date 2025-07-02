import { json, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { useStore } from '@nanostores/react';
import ErrorBoundary from '~/components/ui/ErrorBoundary'; // Import ErrorBoundary

import { Chat } from '~/components/chat/Chat.client';
// Header is in root.tsx
import { Sidebar, activeToolStore, type MainTool } from '~/components/layout/Sidebar';
import { Workbench } from '~/components/workbench/Workbench.client';
import SearchResultsDisplay from '~/components/search/SearchResults';
import { searchUiStore, clearSearchResults, fetchSearchResults as triggerSearch } from '~/lib/stores/search';
import { Input } from '~/components/ui/Input';
import { Button } from '~/components/ui/Button';
import { useState } from 'react';

export const meta: MetaFunction = () => {
  return [{ title: 'Bolt' }, { name: 'description', content: 'Talk with Bolt, an AI assistant from StackBlitz' }];
};

export const loader = () => json({});

const MainContent: React.FC<{ activeTool: MainTool }> = ({ activeTool }) => {
  const searchState = useStore(searchUiStore);
  const [searchQuery, setSearchQuery] = useState('');

  const handlePerformSearch = () => {
    if (searchQuery.trim()) {
      // Note: triggerSearch here is conceptual if it's just fetch.
      // The store pattern usually involves setting loading then results/error.
      // For a dedicated UI, we might call fetchSearchResults directly.
      clearSearchResults(); // Clear previous results
      triggerSearch(searchQuery); // This will update searchUiStore
    }
  };

  switch (activeTool) {
    case 'chat':
      return <Chat />;
    case 'workbench':
      // Workbench.client.tsx likely needs to be adapted to be session-aware for its internal state (open files etc.)
      // This was noted as outstanding in Task 5.
      return <ClientOnly fallback={<div>Loading Workbench...</div>}>{() => <Workbench />}</ClientOnly>;
    case 'search':
      return (
        <div className="p-4 flex flex-col h-full">
          <div className="flex gap-2 mb-4">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter search query..."
              className="flex-grow"
              onKeyPress={(e) => { if (e.key === 'Enter') handlePerformSearch(); }}
            />
            <Button onClick={handlePerformSearch}>Search</Button>
          </div>
          <div className="flex-grow overflow-auto modern-scrollbar">
            <SearchResultsDisplay
              isLoading={searchState?.isLoading}
              results={searchState?.results}
              error={searchState?.error}
              onRetry={searchState?.query ? () => triggerSearch(searchState.query!) : undefined}
            />
          </div>
        </div>
      );
    // case 'settings':
    //   return <div>Settings Page (To be implemented)</div>;
    default:
      return <Chat />; // Default to chat
  }
};

export default function Index() {
  const currentActiveTool = useStore(activeToolStore);

  return (
    <div className="flex flex-row h-full w-full bg-bolt-elements-background-depth-1 overflow-hidden">
      <ClientOnly fallback={null}>{() =>
        <ErrorBoundary fallbackMessage="Sidebar failed to load.">
          <Sidebar activeTool={currentActiveTool} onToolSelect={(tool) => activeToolStore.set(tool)} />
        </ErrorBoundary>
      }</ClientOnly>
      <main className="flex-grow h-full overflow-auto">
        <ErrorBoundary fallbackMessage={`Failed to load content for tool: ${currentActiveTool}. Please try switching tools or reloading.`}>
          <MainContent activeTool={currentActiveTool} />
        </ErrorBoundary>
      </main>
    </div>
  );
}
