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
      className={classNames(
        'flex items-center p-2 sm:p-4 md:p-5 border-b h-[34px] sm:h-[var(--header-height)]', // Adjusted p-3 to p-2, h-[44px] to h-[34px]
        {
          'border-transparent': !chat.started,
          'border-bolt-elements-borderColor': chat.started,
        },
      )}
    >
      <div className="flex items-center gap-1 sm:gap-2 z-logo text-bolt-elements-textPrimary cursor-pointer">
        <div className="i-ph:sidebar-simple-duotone text-base sm:text-xl" /> {/* Adjusted text-lg to text-base */}
        <a href="/" className="text-lg sm:text-2xl font-semibold text-accent flex items-center"> {/* Adjusted text-xl to text-lg */}
          {/* <span className="i-bolt:logo-text?mask w-[46px] inline-block" /> */}
          <img
            src="/logo-light-styled.png"
            alt="logo"
            className="w-[52px] sm:w-[90px] inline-block dark:hidden" // Adjusted w-[70px] to w-[52px]
          />
          <img
            src="/logo-dark-styled.png"
            alt="logo"
            className="w-[52px] sm:w-[90px] inline-block hidden dark:block" // Adjusted w-[70px] to w-[52px]
          />
        </a>
      </div>
      {chat.started && ( // Display ChatDescription and HeaderActionButtons only when the chat has started.
        <>
          <span className="flex-1 px-2 sm:px-4 truncate text-center text-bolt-elements-textPrimary text-xs sm:text-sm md:text-base">
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </span>
          <ClientOnly>
            {() => (
              <div className="mr-1">
                <HeaderActionButtons />
              </div>
            )}
          </ClientOnly>
        </>
      )}
    </header>
  );
}
