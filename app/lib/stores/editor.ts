import { atom, computed, map, type MapStore, type WritableAtom } from 'nanostores';
import type { editor } from 'monaco-editor';
// import type { EditorDocument, ScrollPosition } from '~/components/editor/codemirror/CodeMirrorEditor'; // Old types
import type { FileMap, FilesStore, Dirent } from './files'; // Corrected import
import { createScopedLogger } from '~/utils/logger';
import { activeSessionIdStore, sessionsStore, updateSession, type AppSession, type SessionEditorState as AppSessionEditorState } from '~/lib/stores/sessionManager';

const logger = createScopedLogger('EditorStore');

// Represents the state of a single file within the editor for a session
export interface EditorFileState {
  filePath: string;
  content: string; // Can be unsaved content
  viewState?: editor.ICodeEditorViewState | null;
  isBinary?: boolean; // If needed for Monaco handling or preview
  // lastKnownDiskContent?: string; // Optional: to compare with actual disk for external changes
}

// This will be the primary store holding editor state for all sessions
// However, direct modification will be complex. We'll expose active session stores.
// const sessionEditorStates = map<Record<string, AppSessionEditorState>>({}); // Internal, not directly exposed

export class EditorStore {
  #filesStore: FilesStore;
  #unsubscribeActiveSessionListener: (() => void) | undefined;
  #previousActiveSessionId: string | null = null;

  // These represent the state for the *currently active* session
  public openFilePaths = atom<string[]>([]);
  public activeFilePath = atom<string | undefined>(undefined);
  public fileStates = map<Record<string, EditorFileState>>({}); // filePath -> EditorFileState

  // This computed store provides the EditorDocument-like object for the active file
  public currentDocument = computed(
    [this.activeFilePath, this.fileStates],
    (activePath, states) => {
      if (!activePath || !states[activePath]) {
        return undefined;
      }
      // Adapt to a structure MonacoEditor might expect if needed, or EditorPanel uses this directly
      const activeFileState = states[activePath];
      return {
        filePath: activeFileState.filePath,
        value: activeFileState.content,
        isBinary: activeFileState.isBinary,
        // scroll/viewState is handled by MonacoEditor directly via restoreViewState prop/method
      };
    }
  );

  // To store the ref of the currently active Monaco editor instance
  // This is tricky to manage from a store. Usually, the UI component (EditorPanel) holds the ref.
  // The store would need a way to request the view state from the active editor instance
  // before a session switch.
  private activeMonacoEditorRef: React.RefObject<import('~/components/editor/monaco/MonacoEditor').MonacoEditorRef> | null = null;

  constructor(filesStore: FilesStore) {
    this.#filesStore = filesStore;
    this.#subscribeToActiveSession();

    if (import.meta.hot) {
      // HMR for session-specific stores is more complex.
      // For now, we might lose editor state across HMR if not careful.
      // A simple approach might be to re-load from sessionManager on HMR.
      // import.meta.hot.data.openFilePaths = this.openFilePaths;
      // import.meta.hot.data.activeFilePath = this.activeFilePath;
      // import.meta.hot.data.fileStates = this.fileStates;
    }
  }

  public setActiveMonacoEditorRef(ref: React.RefObject<import('~/components/editor/monaco/MonacoEditor').MonacoEditorRef> | null) {
    this.activeMonacoEditorRef = ref;
  }

  #subscribeToActiveSession() {
    this.#unsubscribeActiveSessionListener = activeSessionIdStore.subscribe(newActiveSessionId => {
      logger.log(`Active session changed. Prev: ${this.#previousActiveSessionId}, New: ${newActiveSessionId}`);
      if (this.#previousActiveSessionId && this.#previousActiveSessionId !== newActiveSessionId) {
        this.#saveEditorStateForSession(this.#previousActiveSessionId);
      }
      if (newActiveSessionId) {
        this.#loadEditorStateForSession(newActiveSessionId);
      } else {
        // No active session, clear editor state
        this.openFilePaths.set([]);
        this.activeFilePath.set(undefined);
        this.fileStates.set({});
      }
      this.#previousActiveSessionId = newActiveSessionId;
    });
  }

  #saveEditorStateForSession(sessionId: string) {
    if (!sessionId) return;
    logger.log(`Saving editor state for session ${sessionId}`);

    let currentActiveFileViewState: editor.ICodeEditorViewState | null = null;
    const activePath = this.activeFilePath.get();
    if (this.activeMonacoEditorRef?.current && activePath) {
      currentActiveFileViewState = this.activeMonacoEditorRef.current.getViewState();
    }

    const currentFileStates = this.fileStates.get();
    const updatedFileStates = {...currentFileStates};

    if (activePath && currentActiveFileViewState && updatedFileStates[activePath]) {
      updatedFileStates[activePath] = { ...updatedFileStates[activePath], viewState: currentActiveFileViewState };
    }

    const sessionEditorState: AppSessionEditorState = {
      openFilePaths: this.openFilePaths.get(),
      activeFilePath: activePath,
      // Make sure to only save states for files that are actually open in this session
      fileStates: this.openFilePaths.get().reduce((acc, path) => {
        if (updatedFileStates[path]) {
          acc[path] = updatedFileStates[path];
        }
        return acc;
      }, {} as Record<string, EditorFileState>),
    };
    updateSession(sessionId, { editorState: sessionEditorState });
  }

  #loadEditorStateForSession(sessionId: string) {
    logger.log(`Loading editor state for session ${sessionId}`);
    const allSessions = sessionsStore.get(); // Get from sessionManager
    const session = allSessions.find(s => s.id === sessionId);

    if (session && session.editorState) {
      this.openFilePaths.set(session.editorState.openFilePaths || []);
      this.activeFilePath.set(session.editorState.activeFilePath);
      this.fileStates.set(session.editorState.fileStates || {});

      // The actual restoration of viewState in Monaco will happen in EditorPanel/MonacoEditor
      // when they react to activeFilePath and fileStates changes.
      // If activeFilePath is set, EditorPanel should find its viewState and tell MonacoEditor to restore it.
      const activePath = session.editorState.activeFilePath;
      if (activePath && session.editorState.fileStates[activePath]?.viewState && this.activeMonacoEditorRef?.current) {
         // Attempt to restore immediately if ref is available.
         // This relies on MonacoEditor being mounted and ready.
         // A more robust way is for MonacoEditor to pick up the viewState from props/context.
         this.activeMonacoEditorRef.current.restoreViewState(session.editorState.fileStates[activePath]!.viewState!);
      }

    } else {
      // Initialize with default empty state for a new or empty session
      this.openFilePaths.set([]);
      this.activeFilePath.set(undefined);
      this.fileStates.set({});
      logger.log(`No saved editor state for session ${sessionId}, initialized to default.`);
    }
  }

  // Call this when the store is no longer needed, e.g. in a cleanup function of a root component
  public dispose() {
    this.#unsubscribeActiveSessionListener?.();
  }

  // Called by WorkbenchStore when base files are loaded/updated
  public syncFilesFromFilesStore(filesFromFs: FileMap) {
    const currentSessionFileStates = this.fileStates.get();
    const newSessionFileStates = { ...currentSessionFileStates };
    let changed = false;

    for (const [filePath, dirent] of Object.entries(filesFromFs)) {
      if (dirent?.type === 'file') {
        const existingState = newSessionFileStates[filePath];
        if (existingState) {
          // File is open in current session, update its content if it's not dirty (or handle merge)
          // For now, if content is different, assume FS is source of truth unless dirty (which means it's in memory)
          // This logic needs to be robust: what if file on disk changed AND memory is dirty?
          // Simplification: only update if content matches what we last thought was disk content
          // Or, if we don't track disk content, this could overwrite unsaved changes.
          // A better way: FilesStore provides original content, EditorStore content is the live buffer.
          // Here, we're just ensuring the fileStates map has an entry if the file exists on "disk".
          if (existingState.content !== dirent.content /* and not dirty (how to check?) */ ) {
            // newSessionFileStates[filePath] = { ...existingState, content: dirent.content }; // Overwrites!
            // logger.log(`Content for ${filePath} updated from FilesStore.`);
            // changed = true;
            // For now, let FilesStore be the source of truth for files not actively being edited with unsaved changes.
            // The editor itself holds the "dirty" state.
          }
        } else {
          // File exists in FS but not in our session's open files states yet.
          // We don't automatically add it to openFilePaths or fileStates here.
          // That happens when user explicitly opens a file.
        }
      }
    }
    // if (changed) {
    //   this.fileStates.set(newSessionFileStates);
    // }
  }

  public openFile(filePath: string, contentFromFs?: string, isBinaryFromFs?: boolean) {
    const openPaths = this.openFilePaths.get();
    if (!openPaths.includes(filePath)) {
      this.openFilePaths.set([...openPaths, filePath]);
    }

    const currentStates = this.fileStates.get();
    if (!currentStates[filePath]) {
        // File not yet in states, load its content from FilesStore if not provided
        const fileContent = contentFromFs ?? this.#filesStore.getFile(filePath)?.content ?? '';
        const isBinary = isBinaryFromFs ?? this.#filesStore.getFile(filePath)?.isBinary ?? false;
        this.fileStates.setKey(filePath, {
            filePath,
            content: fileContent,
            isBinary: isBinary,
            viewState: null, // Initialize with no view state
        });
    }
    this.activeFilePath.set(filePath);
  }

  public closeFile(filePath: string) {
    const openPaths = this.openFilePaths.get().filter(p => p !== filePath);
    this.openFilePaths.set(openPaths);

    const currentStates = { ...this.fileStates.get() };
    delete currentStates[filePath]; // Remove from fileStates
    this.fileStates.set(currentStates);

    if (this.activeFilePath.get() === filePath) {
      this.activeFilePath.set(openPaths.length > 0 ? openPaths[0] : undefined);
    }
  }

  public updateFileContent(filePath: string, newContent: string) {
    const fileState = this.fileStates.get()[filePath];
    if (!fileState) {
      logger.warn(`Attempted to update content for non-open file: ${filePath}`);
      // Optionally, open it: this.openFile(filePath, newContent);
      return;
    }
    // Check for locks from FilesStore
    const fileFromFs = this.#filesStore.getFile(filePath);
    if (fileFromFs?.isLocked) {
      logger.warn(`Attempted to update locked file: ${filePath}`);
      return;
    }

    if (fileState.content !== newContent) {
      this.fileStates.setKey(filePath, { ...fileState, content: newContent });
      // Unsaved changes are now implicit by content difference from FilesStore or last saved state.
      // The global `unsavedFiles` atom in workbenchStore will need to be updated based on this.
    }
  }

  public updateFileViewState(filePath: string, viewState: editor.ICodeEditorViewState | null) {
    const fileState = this.fileStates.get()[filePath];
    if (fileState) {
      this.fileStates.setKey(filePath, { ...fileState, viewState });
    } else {
      logger.warn(`Attempted to update view state for a file not in fileStates: ${filePath}`);
    }
  }
}

// Instantiate and export editorStore
import { filesStore } from './files'; // Import the filesStore instance
export const editorStore = new EditorStore(filesStore);
