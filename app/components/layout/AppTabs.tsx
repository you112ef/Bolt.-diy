import React from 'react';
import { useStore } from '@nanostores/react';
import {
  sessionsStore,
  activeSessionIdStore,
  setActiveSession,
  createNewSession,
  closeSession,
  type AppSession,
} from '~/lib/stores/sessionManager';
import { Button } from '~/components/ui/Button'; // Assuming Button component
import { IconButton } from '~/components/ui/IconButton'; // Assuming IconButton

export const AppTabs: React.FC = () => {
  const sessions = useStore(sessionsStore);
  const activeSessionId = useStore(activeSessionIdStore);

  const handleCreateNewSession = () => {
    const newSession = createNewSession(false); // Create new session, don't make it active immediately
    setActiveSession(newSession.id); // Then set it active to trigger any on-active logic
  };

  return (
    <div className="flex items-center px-2 py-1.5 bg-bolt-elements-background-depth-1 border-b border-bolt-elements-borderColor overflow-x-auto modern-scrollbar">
      <div role="tablist" aria-orientation="horizontal" className="flex items-center space-x-1">
        {sessions.map((session: AppSession) => (
          <div
            key={session.id}
            role="tab"
            aria-selected={session.id === activeSessionId}
            data-state={session.id === activeSessionId ? 'active' : 'inactive'}
            className={`flex items-center whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer
                        hover:bg-bolt-elements-background-depth-2 focus-visible:ring-2 focus-visible:ring-bolt-primary-500
                        ${
                          session.id === activeSessionId
                            ? 'bg-bolt-primary-500 text-white'
                            : 'bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary'
                        }`}
            onClick={() => setActiveSession(session.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setActiveSession(session.id);
              }
            }}
            tabIndex={0} // Make it focusable
          >
            <span>{session.name || `Session ${session.id.slice(-4)}`}</span>
            {sessions.length > 1 && ( // Only show close button if more than one tab
              <IconButton
                icon="i-ph:x-bold"
                size="xs"
                variant="ghost"
                className={`ml-2 p-0.5 rounded ${
                  session.id === activeSessionId
                    ? 'text-white hover:bg-bolt-primary-600'
                    : 'text-bolt-elements-textTertiary hover:bg-bolt-elements-background-depth-3'
                }`}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent tab activation when clicking close
                  closeSession(session.id);
                }}
                aria-label={`Close ${session.name || `Session ${session.id.slice(-4)}`}`}
              />
            )}
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCreateNewSession}
        className="ml-2 flex-shrink-0"
        aria-label="Create new session"
      >
        <div className="i-ph:plus-bold mr-1" /> New Tab
      </Button>
    </div>
  );
};

export default AppTabs;
