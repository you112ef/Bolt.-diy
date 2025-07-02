import { useStore } from '@nanostores/react';
import { memo, useMemo, useRef, useEffect } from 'react'; // Added useRef, useEffect
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import * as Tabs from '@radix-ui/react-tabs';
import MonacoEditor, { type MonacoEditorRef } from '~/components/editor/monaco/MonacoEditor'; // Import MonacoEditorRef
import type { editor } from 'monaco-editor';
import { PanelHeader } from '~/components/ui/PanelHeader';
// Types from CodeMirrorEditor are less relevant now, focus on EditorFileState from new editorStore
// import type { EditorDocument, OnSaveCallback as OnEditorSave, OnScrollCallback as OnEditorScroll, EditorSettings } from '~/components/editor/codemirror/CodeMirrorEditor';
import type { OnSaveCallback as OnEditorSave } from '~/components/editor/codemirror/CodeMirrorEditor'; // Keep if OnEditorSave signature is reused
import { getCurrentChatId, isFileLocked } from '~/utils/fileLocks';
import { PanelHeaderButton } from '~/components/ui/PanelHeaderButton';
import type { FileMap } from '~/lib/stores/files'; // Keep for FileTree
import type { FileHistory } from '~/types/actions';
import { themeStore } from '~/lib/stores/theme';
import { WORK_DIR } from '~/utils/constants';
import { renderLogger } from '~/utils/logger';
import { isMobile } from '~/utils/mobile';
import { FileBreadcrumb } from './FileBreadcrumb';
import { FileTree } from './FileTree';
import { DEFAULT_TERMINAL_SIZE, TerminalTabs } from './terminal/TerminalTabs';
import { editorStore, type EditorFileState } from '~/lib/stores/editor'; // Import new editorStore and its types
import { workbenchStore } from '~/lib/stores/workbench';
import { Search } from './Search';
import { classNames } from '~/utils/classNames';
import { LockManager } from './LockManager';

// Props might change based on how workbenchStore exposes editor states
interface EditorPanelProps {
  // files, unsavedFiles, selectedFile will now come from editorStore via workbenchStore
  isStreaming?: boolean; // Still relevant for read-only state
  // fileHistory may also become part of session/editorStore
  // Callbacks might be simplified if editorStore handles more logic internally
  // onFileSelect?: (value?: string) => void; // Likely editorStore.openFile
  // onFileSave?: OnEditorSave; // Likely editorStore.saveActiveFile (if such a method is added)
  // onFileReset?: () => void; // Likely editorStore.resetActiveFile
}

const DEFAULT_EDITOR_SIZE = 100 - DEFAULT_TERMINAL_SIZE;

// const editorSettings: EditorSettings = { tabSize: 2 }; // Monaco options set in MonacoEditor.tsx

export const EditorPanel = memo(
  (props: EditorPanelProps) => { // Removed destructured props for now, will get from store
    renderLogger.trace('EditorPanel');

    const { isStreaming } = props; // Only isStreaming might be direct prop

    // Get state from the new session-aware editorStore (via workbenchStore)
    const activeFilePath = useStore(editorStore.activeFilePath);
    const allFileStates = useStore(editorStore.fileStates);
    const currentFileState = activeFilePath ? allFileStates[activeFilePath] : undefined;

    // Get these from workbenchStore which should hold instances of other stores
    const filesForFileTree = useStore(workbenchStore.files); // For FileTree
    const unsavedFiles = useStore(workbenchStore.unsavedFiles); // For FileTree and Save/Reset buttons
    // onFileSelect, onFileSave, onFileReset will now call methods on editorStore or workbenchStore
    const onFileSelect = (filePath?: string) => {
      if (filePath) editorStore.openFile(filePath);
      else editorStore.activeFilePath.set(undefined); // Or handle no selection
    };
    const onFileSave = () => {
      if (activeFilePath) workbenchStore.saveFile(activeFilePath); // workbenchStore should have saveFile
    };
    const onFileReset = () => {
      if (activeFilePath && currentFileState) {
        // This needs careful implementation in editorStore to revert to last saved state from FilesStore
        // For now, conceptual:
        // editorStore.resetFileContent(activeFilePath);
        const originalFile = workbenchStore.files.get()[activeFilePath];
        if (originalFile && originalFile.type === 'file') {
            editorStore.updateFileContent(activeFilePath, originalFile.content);
        }
      }
    };


    const currentTheme = useStore(themeStore);
    const showTerminal = useStore(workbenchStore.showTerminal);
    const monacoEditorRef = useRef<MonacoEditorRef>(null);

    useEffect(() => {
      // Provide the active editor ref to the store
      editorStore.setActiveMonacoEditorRef(monacoEditorRef);
      return () => {
        editorStore.setActiveMonacoEditorRef(null); // Clean up
      };
    }, []); // Runs once

    const monacoTheme = currentTheme === 'dark' ? 'vs-dark' : 'light';

    const getLanguageFromPath = (filePath?: string): string => {
      if (!filePath) return 'plaintext';
      const extension = filePath.split('.').pop()?.toLowerCase();
      // ... (language switch case remains the same)
       switch (extension) {
        case 'js': case 'jsx': case 'cjs': case 'mjs': return 'javascript';
        case 'ts': case 'tsx': return 'typescript';
        case 'html': case 'htm': return 'html';
        case 'css': return 'css';
        case 'json': return 'json';
        case 'py': return 'python';
        case 'md': case 'markdown': return 'markdown';
        case 'java': return 'java';
        case 'c': case 'h': return 'c';
        case 'cpp': case 'hpp': case 'cxx': return 'cpp';
        case 'cs': return 'csharp';
        case 'go': return 'go';
        case 'php': return 'php';
        case 'rb': return 'ruby';
        case 'rs': return 'rust';
        case 'swift': return 'swift';
        case 'kt': return 'kotlin';
        case 'sh': return 'shell';
        case 'yaml': case 'yml': return 'yaml';
        case 'xml': return 'xml';
        case 'sql': return 'sql';
        case 'graphql': case 'gql': return 'graphql';
        case 'dockerfile': return 'dockerfile';
        default: return 'plaintext';
      }
    };

    const handleEditorChange = (value: string, event: editor.IModelContentChangedEvent) => {
      if (activeFilePath) {
        editorStore.updateFileContent(activeFilePath, value);
        // Notify workbenchStore about unsaved change
        workbenchStore.unsavedFiles.set(
            new Set(workbenchStore.unsavedFiles.get()).add(activeFilePath)
        );
      }
    };

    const handleViewStateChange = (viewState: editor.ICodeEditorViewState | null) => {
      if (activeFilePath && viewState) {
        editorStore.updateFileViewState(activeFilePath, viewState);
      }
    };

    const isEditorReadOnly = useMemo(() => {
      if (isStreaming || !currentFileState || currentFileState.isBinary) {
        return true;
      }
      const currentChatIdValue = getCurrentChatId();
      return isFileLocked(currentFileState.filePath, currentChatIdValue).locked;
    }, [isStreaming, currentFileState]);


    const activeFileSegments = useMemo(() => {
      if (!activeFilePath) return undefined;
      return activeFilePath.split('/');
    }, [activeFilePath]);

    const activeFileUnsaved = useMemo(() => {
      if (!activeFilePath || !currentFileState) return false;
      // Determine unsaved status by comparing currentFileState.content with FilesStore version
      // This requires FilesStore to be accessible or for editorStore to track original content.
      // For now, using the global unsavedFiles set, which should be updated by handleEditorChange.
      return unsavedFiles.get().has(activeFilePath);
    }, [activeFilePath, currentFileState, unsavedFiles]);

    return (
      <PanelGroup direction="vertical">
        <Panel defaultSize={showTerminal ? DEFAULT_EDITOR_SIZE : 100} minSize={20}>
          <PanelGroup direction="horizontal">
            <Panel defaultSize={20} minSize={15} collapsible className="border-r border-bolt-elements-borderColor">
              <div className="h-full">
                <Tabs.Root defaultValue="files" className="flex flex-col h-full">
                  <PanelHeader className="w-full text-sm font-medium text-bolt-elements-textSecondary px-1">
                    <div className="h-full flex-shrink-0 flex items-center justify-between w-full">
                      <Tabs.List className="h-full flex-shrink-0 flex items-center">
                        <Tabs.Trigger
                          value="files"
                          className={classNames(
                            'h-full bg-transparent hover:bg-bolt-elements-background-depth-3 py-0.5 px-2 rounded-lg text-sm font-medium text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary data-[state=active]:text-bolt-elements-textPrimary',
                          )}
                        >
                          Files
                        </Tabs.Trigger>
                        <Tabs.Trigger
                          value="search"
                          className={classNames(
                            'h-full bg-transparent hover:bg-bolt-elements-background-depth-3 py-0.5 px-2 rounded-lg text-sm font-medium text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary data-[state=active]:text-bolt-elements-textPrimary',
                          )}
                        >
                          Search
                        </Tabs.Trigger>
                        <Tabs.Trigger
                          value="locks"
                          className={classNames(
                            'h-full bg-transparent hover:bg-bolt-elements-background-depth-3 py-0.5 px-2 rounded-lg text-sm font-medium text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary data-[state=active]:text-bolt-elements-textPrimary',
                          )}
                        >
                          Locks
                        </Tabs.Trigger>
                      </Tabs.List>
                    </div>
                  </PanelHeader>

                  <Tabs.Content value="files" className="flex-grow overflow-auto focus-visible:outline-none">
                    <FileTree
                      className="h-full"
                      files={filesForFileTree} // Use filesForFileTree from workbenchStore
                      hideRoot
                      unsavedFiles={unsavedFiles.get()} // Get current value of unsavedFiles
                      // fileHistory={fileHistory} // fileHistory might come from editorStore/session
                      rootFolder={WORK_DIR}
                      selectedFile={activeFilePath} // Use activeFilePath from editorStore
                      onFileSelect={onFileSelect} // Use new onFileSelect
                    />
                  </Tabs.Content>

                  <Tabs.Content value="search" className="flex-grow overflow-auto focus-visible:outline-none">
                    <Search />
                  </Tabs.Content>

                  <Tabs.Content value="locks" className="flex-grow overflow-auto focus-visible:outline-none">
                    <LockManager />
                  </Tabs.Content>
                </Tabs.Root>
              </div>
            </Panel>

            <PanelResizeHandle />
            <Panel className="flex flex-col" defaultSize={80} minSize={20}>
              <PanelHeader className="overflow-x-auto">
                {activeFileSegments?.length && (
                  <div className="flex items-center flex-1 text-sm">
                    <FileBreadcrumb pathSegments={activeFileSegments} files={files} onFileSelect={onFileSelect} />
                    {activeFileUnsaved && (
                      <div className="flex gap-1 ml-auto -mr-1.5">
                        <PanelHeaderButton onClick={onFileSave}>
                          <div className="i-ph:floppy-disk-duotone" />
                          Save
                        </PanelHeaderButton>
                        <PanelHeaderButton onClick={onFileReset}>
                          <div className="i-ph:clock-counter-clockwise-duotone" />
                          Reset
                        </PanelHeaderButton>
                      </div>
                    )}
                  </div>
                )}
              </PanelHeader>
              <div className="h-full flex-1 overflow-hidden modern-scrollbar">
                {editorDocument && !editorDocument.isBinary ? (
                  <MonacoEditor
                    key={editorDocument.filePath}
                    value={editorDocument.value}
                    language={getLanguageFromPath(editorDocument.filePath)}
                    theme={monacoTheme}
                    readOnly={isEditorReadOnly}
                    onChange={handleEditorChange}
                    onSave={onFileSave}
                    filePath={editorDocument.filePath}
                    onScroll={handleScroll}
                    editorDidMount={(editor, monaco) => {
                      // Attempt to restore scroll position using Monaco's view state if possible,
                      // or the simpler scrollTop if that's what's stored.
                      // This part needs to align with how scroll state is saved.
                      // For now, using the simple scrollTop passed from CodeMirror's structure.
                      if (editorDocument?.scroll?.top && editor) {
                        editor.setScrollTop(editorDocument.scroll.top);
                      }
                       if (editorDocument?.scroll?.left && editor) {
                        editor.setScrollLeft(editorDocument.scroll.left);
                      }
                      if (!isMobile() && !isEditorReadOnly) { // Only focus if not read-only
                        editor.focus();
                      }
                    }}
                  />
                ) : editorDocument?.isBinary ? (
                  <div className="p-4">Binary file preview not implemented yet.</div>
                ) : (
                  <div className="p-4 text-center text-gray-500">Select a file to view its content.</div>
                )}
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle />
        <TerminalTabs />
      </PanelGroup>
    );
  },
);
