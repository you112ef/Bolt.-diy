/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import { useStore } from '@nanostores/react';
import type { Message } from 'ai';
import { useChat } from 'ai/react';
import { activeSessionIdStore, sessionsStore } from '~/lib/stores/sessionManager'; // Import session stores
import { useAnimate } from 'framer-motion';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { cssTransition, toast, ToastContainer } from 'react-toastify';
import { useMessageParser, usePromptEnhancer, useShortcuts } from '~/lib/hooks';
import { description, useChatHistory } from '~/lib/persistence';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, PROMPT_COOKIE_KEY, PROVIDER_LIST } from '~/utils/constants';
import { cubicEasingFn } from '~/utils/easings';
import { createScopedLogger, renderLogger } from '~/utils/logger';
import { BaseChat } from './BaseChat';
import Cookies from 'js-cookie';
import { debounce } from '~/utils/debounce';
import { useSettings } from '~/lib/hooks/useSettings';
import type { ProviderInfo } from '~/types/model';
import { useSearchParams } from '@remix-run/react';
import { createSampler } from '~/utils/sampler';
import { getTemplates, selectStarterTemplate } from '~/utils/selectStarterTemplate';
import { logStore } from '~/lib/stores/logs';
import { streamingState } from '~/lib/stores/streaming';
import { filesToArtifacts } from '~/utils/fileUtils';
import { supabaseConnection } from '~/lib/stores/supabase';
import { searchUiStore, clearSearchResults, type SearchUiState } from '~/lib/stores/search'; // Import search store
import SearchResultsDisplay from '~/components/search/SearchResults'; // Import display component

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

const logger = createScopedLogger('Chat');

export function Chat() {
  renderLogger.trace('Chat');

  const currentActiveSessionId = useStore(activeSessionIdStore);
  const allSessions = useStore(sessionsStore);

  const activeSession = allSessions.find(s => s.id === currentActiveSessionId);
  const activeChatId = activeSession?.chatId;

  // Pass activeChatId to useChatHistory
  const { ready, initialMessages, storeMessageHistory, importChat, exportChat, updateChatMestaData } = useChatHistory(activeChatId);

  // The 'description' atom is now updated by useChatHistory based on the activeChatId
  const title = useStore(description);

  useEffect(() => {
    // This effect might need to be session-aware if workbench messages are per-session
    if (ready && activeChatId) { // Only run if chat for the active session is ready
        workbenchStore.setReloadedMessages(initialMessages.map((m) => m.id));
    }
  }, [initialMessages, ready, activeChatId]);

  // Render ChatImpl only if an active chat ID is available and ready
  // or if we are in a state where a new session/chat is about to be created.
  // The `ready` flag from useChatHistory now correctly reflects readiness for the specific activeChatId.
  return (
    <>
      {activeChatId && ready && (
        <ChatImpl
          key={activeChatId} // Add key to force re-mount or full re-render when chat ID changes
          description={title}
          initialMessages={initialMessages}
          exportChat={exportChat}
          storeMessageHistory={storeMessageHistory}
          importChat={importChat}
          // updateChatMestaData={updateChatMestaData} // If ChatImpl needs to call this
        />
      )}
      {!activeChatId && (
        <div className="flex items-center justify-center h-full text-bolt-elements-textSecondary">
          Select or create a session to start chatting.
        </div>
      )}
      <ToastContainer
        closeButton={({ closeToast }) => {
          return (
            <button className="Toastify__close-button" onClick={closeToast}>
              <div className="i-ph:x text-lg" />
            </button>
          );
        }}
        icon={({ type }) => {
          /**
           * @todo Handle more types if we need them. This may require extra color palettes.
           */
          switch (type) {
            case 'success': {
              return <div className="i-ph:check-bold text-bolt-elements-icon-success text-2xl" />;
            }
            case 'error': {
              return <div className="i-ph:warning-circle-bold text-bolt-elements-icon-error text-2xl" />;
            }
          }

          return undefined;
        }}
        position="bottom-right"
        pauseOnFocusLoss
        transition={toastAnimation}
        autoClose={3000}
      />
    </>
  );
}

const processSampledMessages = createSampler(
  (options: {
    messages: Message[];
    initialMessages: Message[];
    isLoading: boolean;
    parseMessages: (messages: Message[], isLoading: boolean) => void;
    storeMessageHistory: (messages: Message[]) => Promise<void>;
  }) => {
    const { messages, initialMessages, isLoading, parseMessages, storeMessageHistory } = options;
    parseMessages(messages, isLoading);

    if (messages.length > initialMessages.length) {
      storeMessageHistory(messages).catch((error) => toast.error(error.message));
    }
  },
  50,
);

interface ChatProps {
  initialMessages: Message[];
  storeMessageHistory: (messages: Message[]) => Promise<void>;
  importChat: (description: string, messages: Message[]) => Promise<void>;
  exportChat: () => void;
  description?: string;
}

export const ChatImpl = memo(
  ({ description, initialMessages, storeMessageHistory, importChat, exportChat }: ChatProps) => {
    useShortcuts();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [chatStarted, setChatStarted] = useState(initialMessages.length > 0);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [imageDataList, setImageDataList] = useState<string[]>([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const [fakeLoading, setFakeLoading] = useState(false);
    const files = useStore(workbenchStore.files);
    const actionAlert = useStore(workbenchStore.alert);
    const deployAlert = useStore(workbenchStore.deployAlert);
    const supabaseConn = useStore(supabaseConnection); // Add this line to get Supabase connection
    const selectedProject = supabaseConn.stats?.projects?.find(
      (project) => project.id === supabaseConn.selectedProjectId,
    );
    const supabaseAlert = useStore(workbenchStore.supabaseAlert);
    const { activeProviders, promptId, autoSelectTemplate, contextOptimizationEnabled } = useSettings();
  const searchState = useStore(searchUiStore); // Existing search state

  // Get the active session's details again, as ChatImpl is memoized
  // and might not re-render just because parent's variables changed if not passed as props.
  // However, `key={activeChatId}` on ChatImpl in the parent Chat component should handle re-mounts.
  // So, this re-fetch might be redundant if `initialMessages` and `description` are correctly passed.
  const currentActiveSessionIdFromChatImpl = useStore(activeSessionIdStore);
  const allSessionsFromChatImpl = useStore(sessionsStore);
  const activeSessionForChatImpl = allSessionsFromChatImpl.find(s => s.id === currentActiveSessionIdFromChatImpl);
  const currentChatIdForLlmApi = activeSessionForChatImpl?.chatId;


    const [model, setModel] = useState(() => {
      const savedModel = Cookies.get('selectedModel');
      return savedModel || DEFAULT_MODEL;
    });
    const [provider, setProvider] = useState(() => {
      const savedProvider = Cookies.get('selectedProvider');
      return (PROVIDER_LIST.find((p) => p.name === savedProvider) || DEFAULT_PROVIDER) as ProviderInfo;
    });

    const { showChat } = useStore(chatStore);

    const [animationScope, animate] = useAnimate();

    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

    const {
      messages,
      isLoading,
      input,
      handleInputChange,
      setInput,
      stop,
      append,
      setMessages,
      reload,
      error,
      data: chatData,
      setData,
    } = useChat({
      api: '/api/chat',
      // Pass currentChatIdForLlmApi to the backend if your API needs to be session-aware
      // This example assumes the backend might use it for logging or context.
      // If your /api/chat is purely stateless per request, this might not be strictly needed in `body`.
      // However, for operations like saving context specific to a chat, it would be.
      body: {
        apiKeys,
        files,
        promptId,
        contextOptimization: contextOptimizationEnabled,
        chatId: currentChatIdForLlmApi, // Pass the current chat ID
        supabase: {
          isConnected: supabaseConn.isConnected,
          hasSelectedProject: !!selectedProject,
          credentials: {
            supabaseUrl: supabaseConn?.credentials?.supabaseUrl,
            anonKey: supabaseConn?.credentials?.anonKey,
          },
        },
      },
      sendExtraMessageFields: true,
      // `id` for useChat hook is for identifying the hook instance, not related to our session chatId here.
      onError: (e) => {
        logger.error('Request failed\n\n', e, error);
        logStore.logError('Chat request failed', e, {
          component: 'Chat',
          action: 'request',
          error: e.message,
        });
        toast.error(
          'There was an error processing your request: ' + (e.message ? e.message : 'No details were returned'),
        );
      },
      onFinish: (message, response) => {
        const usage = response.usage;
        setData(undefined);

        if (usage) {
          console.log('Token usage:', usage);
          logStore.logProvider('Chat response completed', {
            component: 'Chat',
            action: 'response',
            model,
            provider: provider.name,
            usage,
            messageLength: message.content.length,
          });
        }

        logger.debug('Finished streaming');
      },
      initialMessages, // This is now correctly scoped by the parent Chat component
      // initialInput is now managed by the session state
    });

    // Effect to load/save chat input for the current session
    useEffect(() => {
      if (activeSessionForChatImpl) {
        // Load input from session state when session changes or component mounts
        const sessionChatState = activeSessionForChatImpl.chatInput; // Assuming chatInput is added to AppSession
        if (sessionChatState && input !== sessionChatState) {
          setInput(sessionChatState);
        }
      }
      // Save input to session state on change
      // This might be too frequent; consider debouncing or saving on blur/session switch
      // For now, direct update for simplicity of demonstrating the mechanism
      return () => {
        // Cleanup / save on unmount or before session switches if needed
        // This is tricky because activeSessionForChatImpl might be stale here.
        // Saving should ideally happen when session *is about to change*.
      };
    }, [activeSessionForChatImpl?.id, setInput]); // Rerun when session ID changes

    // Debounced save of input to session
    const debouncedSaveInput = useCallback(
        debounce((sessionId: string, currentInput: string) => {
            const { updateSession, sessionsStore: allSessionsStore } =
                require('~/lib/stores/sessionManager') as typeof import('~/lib/stores/sessionManager');
            const currentSessions = allSessionsStore.get();
            const sessionToUpdate = currentSessions.find(s => s.id === sessionId);
            if (sessionToUpdate && sessionToUpdate.chatInput !== currentInput) {
                 updateSession(sessionId, { chatInput: currentInput });
            }
        }, 500),
    []);


    useEffect(() => {
        if (activeSessionForChatImpl?.id && input !== undefined) { // input can be empty string
            debouncedSaveInput(activeSessionForChatImpl.id, input);
        }
    }, [input, activeSessionForChatImpl?.id, debouncedSaveInput]);


    // This useEffect for searchParams prompt should be fine,
    // as it appends to the currently loaded messages for the active session.
    useEffect(() => {
      const prompt = searchParams.get('prompt');
      if (prompt) {
        setSearchParams({}); // Clear search param
        runAnimation(); // Animation logic
        append({
          role: 'user',
          content: [{ type: 'text', text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${prompt}` }] as any,
        });
      }
    }, [model, provider, searchParams, append]); // `append` added to dependencies

    const { enhancingPrompt, promptEnhanced, enhancePrompt, resetEnhancer } = usePromptEnhancer();
    const { parsedMessages, parseMessages } = useMessageParser();

    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;

    useEffect(() => {
      // chatStore's 'started' key might also need to be session-aware if it drives global UI changes.
      // For now, it's based on the initialMessages of the active chat.
      chatStore.setKey('started', initialMessages.length > 0);
    }, [initialMessages]); // Depends on the correctly scoped initialMessages

    useEffect(() => {
      // This effect now correctly uses the session-specific storeMessageHistory and initialMessages
      processSampledMessages({
        messages,
        initialMessages, // session-specific
        isLoading,
        parseMessages,
        storeMessageHistory, // session-specific via useChatHistory instance
      });
    }, [messages, isLoading, parseMessages, initialMessages, storeMessageHistory]);

    const scrollTextArea = () => {
      const textarea = textareaRef.current;

      if (textarea) {
        textarea.scrollTop = textarea.scrollHeight;
      }
    };

    const abort = () => {
      stop();
      chatStore.setKey('aborted', true);
      workbenchStore.abortAllActions();

      logStore.logProvider('Chat response aborted', {
        component: 'Chat',
        action: 'abort',
        model,
        provider: provider.name,
      });
    };

    useEffect(() => {
      const textarea = textareaRef.current;

      if (textarea) {
        textarea.style.height = 'auto';

        const scrollHeight = textarea.scrollHeight;

        textarea.style.height = `${Math.min(scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
        textarea.style.overflowY = scrollHeight > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
      }
    }, [input, textareaRef]);

    const runAnimation = async () => {
      if (chatStarted) {
        return;
      }

      await Promise.all([
        animate('#examples', { opacity: 0, display: 'none' }, { duration: 0.1 }),
        animate('#intro', { opacity: 0, flex: 1 }, { duration: 0.2, ease: cubicEasingFn }),
      ]);

      chatStore.setKey('started', true);

      setChatStarted(true);
    };

    const sendMessage = async (_event: React.UIEvent, messageInput?: string) => {
      const messageContent = messageInput || input;

      if (!messageContent?.trim()) {
        return;
      }

      if (isLoading) {
        abort();
        return;
      }

      // If no locked items, proceed normally with the original message
      const finalMessageContent = messageContent;

      runAnimation();

      if (!chatStarted) {
        setFakeLoading(true);

        if (autoSelectTemplate) {
          const { template, title } = await selectStarterTemplate({
            message: finalMessageContent,
            model,
            provider,
          });

          if (template !== 'blank') {
            const temResp = await getTemplates(template, title).catch((e) => {
              if (e.message.includes('rate limit')) {
                toast.warning('Rate limit exceeded. Skipping starter template\n Continuing with blank template');
              } else {
                toast.warning('Failed to import starter template\n Continuing with blank template');
              }

              return null;
            });

            if (temResp) {
              const { assistantMessage, userMessage } = temResp;
              setMessages([
                {
                  id: `1-${new Date().getTime()}`,
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${finalMessageContent}`,
                    },
                    ...imageDataList.map((imageData) => ({
                      type: 'image',
                      image: imageData,
                    })),
                  ] as any,
                },
                {
                  id: `2-${new Date().getTime()}`,
                  role: 'assistant',
                  content: assistantMessage,
                },
                {
                  id: `3-${new Date().getTime()}`,
                  role: 'user',
                  content: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${userMessage}`,
                  annotations: ['hidden'],
                },
              ]);
              reload();
              setInput('');
              Cookies.remove(PROMPT_COOKIE_KEY);

              setUploadedFiles([]);
              setImageDataList([]);

              resetEnhancer();

              textareaRef.current?.blur();
              setFakeLoading(false);

              return;
            }
          }
        }

        // If autoSelectTemplate is disabled or template selection failed, proceed with normal message
        setMessages([
          {
            id: `${new Date().getTime()}`,
            role: 'user',
            content: [
              {
                type: 'text',
                text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${finalMessageContent}`,
              },
              ...imageDataList.map((imageData) => ({
                type: 'image',
                image: imageData,
              })),
            ] as any,
          },
        ]);
        reload();
        setFakeLoading(false);
        setInput('');
        Cookies.remove(PROMPT_COOKIE_KEY);

        setUploadedFiles([]);
        setImageDataList([]);

        resetEnhancer();

        textareaRef.current?.blur();

        return;
      }

      if (error != null) {
        setMessages(messages.slice(0, -1));
      }

      const modifiedFiles = workbenchStore.getModifiedFiles();

      chatStore.setKey('aborted', false);

      if (modifiedFiles !== undefined) {
        const userUpdateArtifact = filesToArtifacts(modifiedFiles, `${Date.now()}`);
        append({
          role: 'user',
          content: [
            {
              type: 'text',
              text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${userUpdateArtifact}${finalMessageContent}`,
            },
            ...imageDataList.map((imageData) => ({
              type: 'image',
              image: imageData,
            })),
          ] as any,
        });

        workbenchStore.resetAllFileModifications();
      } else {
        append({
          role: 'user',
          content: [
            {
              type: 'text',
              text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${finalMessageContent}`,
            },
            ...imageDataList.map((imageData) => ({
              type: 'image',
              image: imageData,
            })),
          ] as any,
        });
      }

      setInput('');
      Cookies.remove(PROMPT_COOKIE_KEY);

      setUploadedFiles([]);
      setImageDataList([]);

      resetEnhancer();

      textareaRef.current?.blur();
    };

    /**
     * Handles the change event for the textarea and updates the input state.
     * @param event - The change event from the textarea.
     */
    const onTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      handleInputChange(event);
    };

    /**
     * Debounced function to cache the prompt in cookies.
     * Caches the trimmed value of the textarea input after a delay to optimize performance.
     */
    const debouncedCachePrompt = useCallback(
      debounce((event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const trimmedValue = event.target.value.trim();
        Cookies.set(PROMPT_COOKIE_KEY, trimmedValue, { expires: 30 });
      }, 1000),
      [],
    );

    useEffect(() => {
      const storedApiKeys = Cookies.get('apiKeys');

      if (storedApiKeys) {
        setApiKeys(JSON.parse(storedApiKeys));
      }
    }, []);

    const handleModelChange = (newModel: string) => {
      setModel(newModel);
      Cookies.set('selectedModel', newModel, { expires: 30 });
    };

    const handleProviderChange = (newProvider: ProviderInfo) => {
      setProvider(newProvider);
      Cookies.set('selectedProvider', newProvider.name, { expires: 30 });
    };

    return (
      <BaseChat
        ref={animationScope}
        textareaRef={textareaRef}
        input={input}
        showChat={showChat}
        chatStarted={chatStarted}
        isStreaming={isLoading || fakeLoading}
        onStreamingChange={(streaming) => {
          streamingState.set(streaming);
        }}
        enhancingPrompt={enhancingPrompt}
        promptEnhanced={promptEnhanced}
        sendMessage={sendMessage}
        model={model}
        setModel={handleModelChange}
        provider={provider}
        setProvider={handleProviderChange}
        providerList={activeProviders}
        handleInputChange={(e) => {
          onTextareaChange(e);
          debouncedCachePrompt(e);
        }}
        handleStop={abort}
        description={description}
        importChat={importChat}
        exportChat={exportChat}
        messages={messages.map((message, i) => {
          if (message.role === 'user') {
            return message;
          }

          return {
            ...message,
            content: parsedMessages[i] || '',
          };
        })}
        enhancePrompt={() => {
          enhancePrompt(
            input,
            (input) => {
              setInput(input);
              scrollTextArea();
            },
            model,
            provider,
            apiKeys,
          );
        }}
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
        imageDataList={imageDataList}
        setImageDataList={setImageDataList}
        actionAlert={actionAlert}
        clearAlert={() => workbenchStore.clearAlert()}
        supabaseAlert={supabaseAlert}
        clearSupabaseAlert={() => workbenchStore.clearSupabaseAlert()}
        deployAlert={deployAlert}
        clearDeployAlert={() => workbenchStore.clearDeployAlert()}
        data={chatData}
        searchState={searchState} // Pass search state
        clearSearch={() => clearSearchResults()} // Pass clear function
      />
    );
  },
);

// Modify BaseChatProps to include searchState and clearSearch
// This assumes BaseChat.tsx can be modified or already accepts arbitrary children/slots.
// For this example, I'll assume BaseChat.tsx is where SearchResultsDisplay will be rendered.
// If BaseChat.tsx is not modifiable directly, SearchResultsDisplay might need to be
// rendered alongside BaseChat in the ChatImpl component.

// In BaseChat.tsx (conceptual change, not directly editable by this tool but shown for completeness):
/*
interface BaseChatProps {
  // ... existing props
  searchState?: SearchUiState | null;
  clearSearch?: () => void;
}

// ... in BaseChat's render logic, perhaps above the message input or as a dismissible overlay:
{searchState && (searchState.results || searchState.error || searchState.isLoading) && (
  <div className="search-results-container p-2 border-t border-gray-200 dark:border-gray-700">
    <SearchResultsDisplay
      isLoading={searchState.isLoading}
      results={searchState.results}
      error={searchState.error}
      onRetry={searchState.query ? () => {
        // Re-trigger search logic, possibly by re-sending a hidden command
        // or calling a search function directly if available.
        // For now, simple clear.
        if (clearSearch) clearSearch();
      } : undefined}
    />
    <button
      onClick={clearSearch}
      className="absolute top-2 right-2 p-1 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"
      aria-label="Close search results"
    >
      X
    </button>
  </div>
)}
*/
