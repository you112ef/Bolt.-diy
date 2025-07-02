import { useStore } from '@nanostores/react';
import { memo, useMemo } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import * as Tabs from '@radix-ui/react-tabs';
import MonacoEditor from '~/components/editor/monaco/MonacoEditor';
import type { editor } from 'monaco-editor';
import { PanelHeader } from '~/components/ui/PanelHeader';
import type { EditorDocument, OnSaveCallback as OnEditorSave, OnScrollCallback as OnEditorScroll, EditorSettings } from '~/components/editor/codemirror/CodeMirrorEditor'; // Keep for types if needed temporarily
import { getCurrentChatId, isFileLocked } from '~/utils/fileLocks'; // Import file lock utilities
import { PanelHeaderButton } from '~/components/ui/PanelHeaderButton';
import type { FileMap } from '~/lib/stores/files';
import type { FileHistory } from '~/types/actions';
import { themeStore } from '~/lib/stores/theme';
import { WORK_DIR } from '~/utils/constants';
import { renderLogger } from '~/utils/logger';
import { isMobile } from '~/utils/mobile';
import { FileBreadcrumb } from './FileBreadcrumb';
import { FileTree } from './FileTree';
import { DEFAULT_TERMINAL_SIZE, TerminalTabs } from './terminal/TerminalTabs';
import { workbenchStore } from '~/lib/stores/workbench';
import { Search } from './Search'; // <-- Ensure Search is imported
import { classNames } from '~/utils/classNames'; // <-- Import classNames if not already present
import { LockManager } from './LockManager'; // <-- Import LockManager

interface EditorPanelProps {
  files?: FileMap;
  unsavedFiles?: Set<string>;
  editorDocument?: EditorDocument;
  selectedFile?: string | undefined;
  isStreaming?: boolean;
  fileHistory?: Record<string, FileHistory>;
  onEditorChange?: (value: string) => void; // Simplified for now
  onEditorScroll?: OnEditorScroll; // Will address later
  onFileSelect?: (value?: string) => void;
  onFileSave?: OnEditorSave;
  onFileReset?: () => void;
}

const DEFAULT_EDITOR_SIZE = 100 - DEFAULT_TERMINAL_SIZE;

// editorSettings might be used by Monaco options if needed, e.g., tabSize
const editorSettings: EditorSettings = { tabSize: 2 };

export const EditorPanel = memo(
  ({
    files,
    unsavedFiles,
    editorDocument,
    selectedFile,
    isStreaming,
    fileHistory,
    onFileSelect,
    onEditorChange, // Simplified
    onEditorScroll, // To be handled
    onFileSave,
    onFileReset,
  }: EditorPanelProps) => {
    renderLogger.trace('EditorPanel');

    const currentTheme = useStore(themeStore);
    const showTerminal = useStore(workbenchStore.showTerminal);

    const monacoTheme = currentTheme === 'dark' ? 'vs-dark' : 'light';

    // More robust language detection, can be expanded
    const getLanguageFromPath = (filePath?: string): string => {
      if (!filePath) return 'plaintext';
      const extension = filePath.split('.').pop()?.toLowerCase();
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
      if (onEditorChange && editorDocument) {
        onEditorChange(value); // Pass only the value for now
      }
    };

    // Determine if the editor should be read-only
    const isEditorReadOnly = useMemo(() => {
      if (isStreaming || !editorDocument || editorDocument.isBinary) {
        return true;
      }
      // TODO: Re-evaluate how currentChatId is obtained if it's reactive.
      // For now, assuming it's relatively stable or obtained from a store if needed.
      // const currentChatIdValue = getCurrentChatId(); // This might need to be from a store if it changes reactively
      // For simplicity in this step, we'll assume a static or globally available chat ID if needed by isFileLocked.
      // If isFileLocked doesn't rely on a frequently changing chatId prop, this is fine.
      // Otherwise, this logic might need to be inside a component that can react to chat ID changes.
      const currentChatIdValue = getCurrentChatId(); // Assuming this utility provides the correct current chat context
      return isFileLocked(editorDocument.filePath, currentChatIdValue).locked;
    }, [isStreaming, editorDocument]);

    const handleScroll = (scrollTop: number, scrollLeft: number) => {
      if (onEditorScroll && editorDocument) {
        // The original onEditorScroll might expect a more complex object.
        // For now, we adapt to what Monaco provides easily.
        // Original: onEditorScroll({ top: scrollTop, left: scrollLeft, line?: number, column?: number });
        // This might need adjustment based on how scroll positions are stored and restored.
        // For instance, Monaco's view state is better for full restoration.
        onEditorScroll({ top: scrollTop, left: scrollLeft });
      }
    };

    const activeFileSegments = useMemo(() => {
      if (!editorDocument) {
        return undefined;
      }

      return editorDocument.filePath.split('/');
    }, [editorDocument]);

    const activeFileUnsaved = useMemo(() => {
      if (!editorDocument || !unsavedFiles) {
        return false;
      }

      // Make sure unsavedFiles is a Set before calling has()
      return unsavedFiles instanceof Set && unsavedFiles.has(editorDocument.filePath);
    }, [editorDocument, unsavedFiles]);

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
                      files={files}
                      hideRoot
                      unsavedFiles={unsavedFiles}
                      fileHistory={fileHistory}
                      rootFolder={WORK_DIR}
                      selectedFile={selectedFile}
                      onFileSelect={onFileSelect}
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
