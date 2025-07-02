import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat'; // Keep for chat.started if still relevant for some UI elements
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
// import { ChatDescription } from '~/lib/persistence/ChatDescription.client'; // Replaced by session name
import { activeSessionIdStore, sessionsStore } from '~/lib/stores/sessionManager';

export function Header() {
  const chat = useStore(chatStore); // Still used for border style based on chat.started
  const currentActiveSessionId = useStore(activeSessionIdStore);
  const allSessions = useStore(sessionsStore);

  const activeSession = allSessions.find(s => s.id === currentActiveSessionId);
  const sessionName = activeSession ? activeSession.name : "No Active Session";

  // The Header's border might still depend on whether any chat (in the active session) has started.
  // This logic might need refinement if `chat.started` is not truly global anymore.
  // For now, assuming `chat.started` reflects the active session's chat state.
  const hasChatStartedInActiveSession = activeSession ? chat.started : false;


  return (
    <header
      className={classNames(
        'flex items-center px-4 py-2 border-b h-[var(--header-height)] shrink-0', // Adjusted padding
        {
          'border-transparent': !hasChatStartedInActiveSession, // Or simply always border if tabs are present
          'border-bolt-elements-borderColor': hasChatStartedInActiveSession,
        }
      )}
    >
      {/* Sidebar Toggle - conceptual, assuming sidebar visibility is managed elsewhere */}
      {/* <IconButton icon="i-ph:sidebar-simple-duotone" className="mr-3 text-xl" /> */}

      <div className="flex items-center gap-2 z-logo text-bolt-elements-textPrimary cursor-pointer">
        {/* Logo can remain if desired */}
        <a href="/" className="flex items-center">
          <img src="/logo-light-styled.png" alt="logo" className="h-6 w-auto inline-block dark:hidden" />
          <img src="/logo-dark-styled.png" alt="logo" className="h-6 w-auto inline-block hidden dark:block" />
        </a>
      </div>

      {/* Session Name - Centered */}
      <div className="flex-1 px-4 truncate text-center text-bolt-elements-textPrimary font-medium">
        <span>{sessionName}</span>
      </div>

      {/* Action Buttons - Right Aligned */}
      <ClientOnly>
        {() => (
          <div className="ml-auto"> {/* Use ml-auto to push to the right */}
            <HeaderActionButtons />
          </div>
        )}
      </ClientOnly>
    </header>
  );
}
