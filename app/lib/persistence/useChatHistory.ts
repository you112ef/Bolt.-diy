import { useLoaderData, useNavigate, useSearchParams } from '@remix-run/react';
import { useState, useEffect, useCallback } from 'react';
import { atom } from 'nanostores';
import { generateId, type JSONValue, type Message } from 'ai';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import { logStore } from '~/lib/stores/logs'; // Import logStore
import {
  getMessages,
  getNextId,
  getUrlId,
  openDatabase,
  setMessages,
  duplicateChat,
  createChatFromMessages,
  getSnapshot,
  setSnapshot,
  type IChatMetadata,
} from './db';
import type { FileMap } from '~/lib/stores/files';
import type { Snapshot } from './types';
import { webcontainer } from '~/lib/webcontainer';
import { detectProjectCommands, createCommandActionsString } from '~/utils/projectCommands';
import type { ContextAnnotation } from '~/types/context';

export interface ChatHistoryItem {
  id: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
  metadata?: IChatMetadata;
}

const persistenceEnabled = !import.meta.env.VITE_DISABLE_PERSISTENCE;

export const db = persistenceEnabled ? await openDatabase() : undefined;

export const chatId = atom<string | undefined>(undefined);
export const description = atom<string | undefined>(undefined); // This will reflect the active session's chat description
export const chatMetadata = atom<IChatMetadata | undefined>(undefined); // This will reflect the active session's chat metadata

// The hook now accepts the chatId of the currently active session
export function useChatHistory(activeSessionChatId?: string) {
  const navigate = useNavigate();
  // const { id: mixedId } = useLoaderData<{ id?: string }>(); // No longer used from loader for ID
  const [searchParams] = useSearchParams();

  const [archivedMessages, setArchivedMessages] = useState<Message[]>([]);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  const [urlId, setUrlId] = useState<string | undefined>(); // This might also become session-specific if URLs change per tab

  useEffect(() => {
    // Clear previous chat state when activeSessionChatId changes or is undefined
    if (!activeSessionChatId) {
      setInitialMessages([]);
      setArchivedMessages([]);
      description.set(undefined);
      chatId.set(undefined); // Clear global chatId atom
      chatMetadata.set(undefined);
      setUrlId(undefined);
      setReady(true); // Ready, but with no chat loaded
      return;
    }

    // Reset ready state for the new chat ID
    setReady(false);

    if (!db) {
      setReady(true);
      if (persistenceEnabled) {
        const error = new Error('Chat persistence is unavailable');
        logStore.logError('Chat persistence initialization failed', error);
        toast.error('Chat persistence is unavailable');
      }
      return;
    }

    // Now use activeSessionChatId instead of mixedId
    if (activeSessionChatId) {
      Promise.all([
        getMessages(db, activeSessionChatId),
        getSnapshot(db, activeSessionChatId),
      ])
        .then(async ([storedMessages, snapshot]) => {
          if (storedMessages && storedMessages.messages.length > 0) {
            // Existing logic using storedMessages and snapshot...
            // Ensure that chatId.set() uses activeSessionChatId
            /*
             * const snapshotStr = localStorage.getItem(`snapshot:${mixedId}`); // Remove localStorage usage
             * const snapshot: Snapshot = snapshotStr ? JSON.parse(snapshotStr) : { chatIndex: 0, files: {} }; // Use snapshot from DB
             */
            const validSnapshot = snapshot || { chatIndex: '', files: {} }; // Ensure snapshot is not undefined
            const summary = validSnapshot.summary;

            const rewindId = searchParams.get('rewindTo');
            let startingIdx = -1;
            const endingIdx = rewindId
              ? storedMessages.messages.findIndex((m) => m.id === rewindId) + 1
              : storedMessages.messages.length;
            const snapshotIndex = storedMessages.messages.findIndex((m) => m.id === validSnapshot.chatIndex);

            if (snapshotIndex >= 0 && snapshotIndex < endingIdx) {
              startingIdx = snapshotIndex;
            }

            if (snapshotIndex > 0 && storedMessages.messages[snapshotIndex].id == rewindId) {
              startingIdx = -1;
            }

            let filteredMessages = storedMessages.messages.slice(startingIdx + 1, endingIdx);
            let archivedMessages: Message[] = [];

            if (startingIdx >= 0) {
              archivedMessages = storedMessages.messages.slice(0, startingIdx + 1);
            }

            setArchivedMessages(archivedMessages);

            if (startingIdx > 0) {
              const files = Object.entries(validSnapshot?.files || {})
                .map(([key, value]) => {
                  if (value?.type !== 'file') {
                    return null;
                  }

                  return {
                    content: value.content,
                    path: key,
                  };
                })
                .filter((x): x is { content: string; path: string } => !!x); // Type assertion
              const projectCommands = await detectProjectCommands(files);

              // Call the modified function to get only the command actions string
              const commandActionsString = createCommandActionsString(projectCommands);

              filteredMessages = [
                {
                  id: generateId(),
                  role: 'user',
                  content: `Restore project from snapshot`, // Removed newline
                  annotations: ['no-store', 'hidden'],
                },
                {
                  id: storedMessages.messages[snapshotIndex].id,
                  role: 'assistant',

                  // Combine followup message and the artifact with files and command actions
                  content: `Bolt Restored your chat from a snapshot. You can revert this message to load the full chat history.
                  <boltArtifact id="restored-project-setup" title="Restored Project & Setup" type="bundled">
                  ${Object.entries(snapshot?.files || {})
                    .map(([key, value]) => {
                      if (value?.type === 'file') {
                        return `
                      <boltAction type="file" filePath="${key}">
${value.content}
                      </boltAction>
                      `;
                      } else {
                        return ``;
                      }
                    })
                    .join('\n')}
                  ${commandActionsString} 
                  </boltArtifact>
                  `, // Added commandActionsString, followupMessage, updated id and title
                  annotations: [
                    'no-store',
                    ...(summary
                      ? [
                          {
                            chatId: storedMessages.messages[snapshotIndex].id,
                            type: 'chatSummary',
                            summary,
                          } satisfies ContextAnnotation,
                        ]
                      : []),
                  ],
                },

                // Remove the separate user and assistant messages for commands
                /*
                 *...(commands !== null // This block is no longer needed
                 *  ? [ ... ]
                 *  : []),
                 */
                ...filteredMessages,
              ];
              restoreSnapshot(mixedId);
            }

            setInitialMessages(filteredMessages);
            setUrlId(storedMessages.urlId); // This might need to be managed if URL should reflect session
            description.set(storedMessages.description);
            chatId.set(storedMessages.id); // Set the global chatId atom for the active session
            chatMetadata.set(storedMessages.metadata);
          } else {
            // If no messages for this chatId, it's effectively a new/empty chat for this session
            setInitialMessages([]);
            setArchivedMessages([]);
            description.set(undefined); // Clear description for this "new" chat
            chatId.set(activeSessionChatId); // Set the global atom to the active one
            chatMetadata.set(undefined);
            setUrlId(undefined); // No URL ID yet for a new chat
            // navigate('/', { replace: true }); // Avoid navigating, let the session manager handle UI
          }
          setReady(true);
        })
        .catch((error) => {
          console.error(`Failed to load chat for ID ${activeSessionChatId}:`, error);
          logStore.logError(`Failed to load chat messages or snapshot for ${activeSessionChatId}`, error);
          toast.error(`Failed to load chat for session: ${error.message}`);
          setInitialMessages([]); // Ensure clean state on error
          setArchivedMessages([]);
          chatId.set(activeSessionChatId); // Still set the ID so new messages can be saved to it
          setReady(true); // Mark as ready even on error to allow UI to proceed
        });
    } else {
      // This case should ideally not be hit if activeSessionChatId is always provided by a managing component
      setReady(true);
    }
  }, [activeSessionChatId, searchParams]); // Removed db, navigate from deps as they are stable. Added activeSessionChatId.

  const takeSnapshot = useCallback(
    // activeSessionChatId is the source of truth for the current chat context
    async (chatIdx: string, files: FileMap, currentChatIdForSnapshot?: string | undefined, chatSummary?: string) => {
      const idToUse = currentChatIdForSnapshot || activeSessionChatId;

      if (!idToUse || !db) {
        return;
      }

      const snapshot: Snapshot = {
        chatIndex: chatIdx,
        files,
        summary: chatSummary,
      };

      try {
        await setSnapshot(db, idToUse, snapshot);
      } catch (error) {
        console.error('Failed to save snapshot:', error);
        toast.error('Failed to save chat snapshot.');
      }
    },
    [activeSessionChatId], // Depend on activeSessionChatId
  );

  // restoreSnapshot should operate on the provided id, not necessarily the active one
  const restoreSnapshot = useCallback(async (idToRestoreFor: string, snapshot?: Snapshot) => {
    const container = await webcontainer;

    const validSnapshot = snapshot || { chatIndex: '', files: {} };

    if (!validSnapshot?.files) {
      return;
    }

    Object.entries(validSnapshot.files).forEach(async ([key, value]) => {
      if (key.startsWith(container.workdir)) {
        key = key.replace(container.workdir, '');
      }

      if (value?.type === 'folder') {
        await container.fs.mkdir(key, { recursive: true });
      }
    });
    Object.entries(validSnapshot.files).forEach(async ([key, value]) => {
      if (value?.type === 'file') {
        if (key.startsWith(container.workdir)) {
          key = key.replace(container.workdir, '');
        }

        await container.fs.writeFile(key, value.content, { encoding: value.isBinary ? undefined : 'utf8' });
      } else {
      }
    });

    // workbenchStore.files.setKey(snapshot?.files)
  }, []);

  return {
    ready: !activeSessionChatId || ready, // Ready if no active chat or if loading for active chat is done/failed
    initialMessages,
    // updateChatMestaData and storeMessageHistory now need to ensure they use activeSessionChatId
    updateChatMestaData: async (metadataToSet: IChatMetadata) => {
      if (!db || !activeSessionChatId) {
        toast.error('Cannot update metadata: No active chat session.');
        return;
      }
      try {
        // Assuming initialMessages and description.get() correctly reflect the active chat's state
        await setMessages(db, activeSessionChatId, initialMessages, urlId, description.get(), undefined, metadataToSet);
        chatMetadata.set(metadataToSet); // Update global atom for current active chat
      } catch (error) {
        toast.error('Failed to update chat metadata');
        console.error(error);
      }
    },
    storeMessageHistory: async (messages: Message[]) => {
      if (!db || messages.length === 0 || !activeSessionChatId) {
        if(!activeSessionChatId) toast.error('Cannot save messages: No active chat session.');
        return;
      }

      const { firstArtifact } = workbenchStore; // This might need to be session-specific if artifacts are
      messages = messages.filter((m) => !m.annotations?.includes('no-store'));

      // urlId logic might need to be revisited for sessions if each tab doesn't have a unique URL path
      // For now, assume urlId is associated with the activeSessionChatId
      let currentUrlId = urlId;
      if (!currentUrlId && firstArtifact?.id) {
        // This logic might need adjustment. If urlId is for navigation,
        // and tabs don't change URL, this could be problematic.
        // currentUrlId = await getUrlId(db, firstArtifact.id);
        // setUrlId(currentUrlId); // Update state for current session
        // navigateChat(currentUrlId); // This navigation might be unwanted with tabs
      }

      let chatSummary: string | undefined = undefined;
      // ... (chatSummary extraction logic remains the same)
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
         if (lastMessage.role === 'assistant') {
            const annotations = lastMessage.annotations as JSONValue[];
            const filteredAnnotations = (annotations?.filter(
              (annotation: JSONValue) =>
                annotation && typeof annotation === 'object' && Object.keys(annotation).includes('type'),
            ) || []) as { type: string; value: any } & { [key: string]: any }[];

            if (filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')) {
              chatSummary = filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')?.summary;
            }
          }
        // Pass activeSessionChatId to takeSnapshot
        takeSnapshot(lastMessage.id, workbenchStore.files.get(), activeSessionChatId, chatSummary);
      }


      if (!description.get() && firstArtifact?.title) {
        description.set(firstArtifact?.title); // Sets description for the current active chat
      }

      // No need to generate a new ID here, activeSessionChatId is the one.
      // If activeSessionChatId was somehow undefined but we reached here, it's an issue.

      await setMessages(
        db,
        activeSessionChatId,
        [...archivedMessages, ...messages],
        currentUrlId, // Use potentially updated urlId
        description.get(),
        undefined, // timestamp will be auto-updated by setMessages
        chatMetadata.get(),
      );
    },
    // duplicateCurrentChat and importChat will likely need to interact with sessionManager
    // to create new sessions rather than just new chat DB entries and navigating.
    // For now, they are adapted to use activeSessionChatId if no specific ID is given.
    duplicateCurrentChat: async (listItemId?: string) => {
      const idToDuplicate = listItemId || activeSessionChatId;
      if (!db || !idToDuplicate) {
        toast.error('No chat to duplicate.');
        return;
      }
      try {
        // This creates a new chat entry in DB. UI needs to create a new session for it.
        const newDbChatId = await duplicateChat(db, idToDuplicate);
        // TODO: Integrate with sessionManager to create a new AppSession for this newDbChatId
        // For now, just logs and gives a success message for DB duplication.
        console.log(`Chat duplicated in DB with new ID: ${newDbChatId}. Manual session creation needed.`);
        toast.success('Chat data duplicated. (Manual session tab creation needed)');
        // navigate(`/chat/${newId}`); // Navigation handled by session tabs
      } catch (error) {
        toast.error('Failed to duplicate chat data.');
        console.log(error);
      }
    },
    importChat: async (newChatDescription: string, messagesToImport: Message[], metadataToImport?: IChatMetadata) => {
      if (!db) {
        return;
      }

      try {
        const newId = await createChatFromMessages(db, description, messages, metadata);
        window.location.href = `/chat/${newId}`;
        toast.success('Chat imported successfully');
      } catch (error) {
        if (error instanceof Error) {
          toast.error('Failed to import chat: ' + error.message);
        } else {
          toast.error('Failed to import chat');
        }
      }
    },
    exportChat: async (id = urlId) => {
      if (!db || !id) {
        return;
      }

      const chat = await getMessages(db, id);
      const chatData = {
        messages: chat.messages,
        description: chat.description,
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  };
}

function navigateChat(nextId: string) {
  /**
   * FIXME: Using the intended navigate function causes a rerender for <Chat /> that breaks the app.
   *
   * `navigate(`/chat/${nextId}`, { replace: true });`
   */
  const url = new URL(window.location.href);
  url.pathname = `/chat/${nextId}`;

  window.history.replaceState({}, '', url);
}
