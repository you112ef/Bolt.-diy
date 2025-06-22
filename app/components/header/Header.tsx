import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';

export function Header() {
  const chat = useStore(chatStore);

  return (
    <header
      className={classNames('flex items-center p-3 sm:p-4 border-b h-[var(--header-height)] w-full', { // Added w-full, reduced padding
        'border-transparent': !chat.started,
        'border-bolt-elements-borderColor': chat.started,
      })}
    >
      <div className="flex items-center gap-1 sm:gap-2 z-logo text-bolt-elements-textPrimary cursor-pointer"> {/* Reduced gap */}
        <div className="i-ph:sidebar-simple-duotone text-lg sm:text-xl" /> {/* Reduced icon size */}
        <a href="/" className="text-xl sm:text-2xl font-semibold text-accent flex items-center"> {/* Reduced text size */}
          {/* <span className="i-bolt:logo-text?mask w-[46px] inline-block" /> */}
          {/* Reduced logo size */}
          <img src="/logo-light-styled.png" alt="logo" className="w-[70px] sm:w-[90px] inline-block dark:hidden" />
          <img src="/logo-dark-styled.png" alt="logo" className="w-[70px] sm:w-[90px] inline-block hidden dark:block" />
        </a>
      </div>
      {chat.started && ( // Display ChatDescription and HeaderActionButtons only when the chat has started.
        <>
          <span className="flex-1 px-2 sm:px-4 truncate text-center text-bolt-elements-textPrimary text-xs sm:text-sm"> {/* Reduced padding and text size */}
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </span>
          <ClientOnly>
            {() => (
              <div className="mr-0.5 sm:mr-1"> {/* Reduced margin */}
                <HeaderActionButtons />
              </div>
            )}
          </ClientOnly>
        </>
      )}
    </header>
  );
}
