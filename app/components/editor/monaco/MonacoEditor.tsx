import React, { useRef, useEffect, useState, useCallback } from 'react';
import MonacoEditor, { type Monaco } from 'react-monaco-editor';
import type { editor } from 'monaco-editor';
import { openDatabase, getEditorContent, setEditorContent } from '~/lib/persistence/db'; // IndexedDB functions
import { debounce } from '~/utils/debounce'; // Utility for debouncing

const logger = console; // Or use a proper logger if available globally

export interface MonacoEditorProps {
  value?: string;
  language?: string;
  theme?: 'vs-dark' | 'light'; // Simplified for now
  readOnly?: boolean;
  onChange?: (value: string, event: editor.IModelContentChangedEvent) => void;
  onSave?: () => void; // For Ctrl+S or Cmd+S
  editorDidMount?: (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => void;
  filePath?: string;
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
  // Expose methods for view state saving/restoring if using a ref
  // This is more for parent components to call, so might be better handled
  // by passing a callback that receives the editor instance, or by directly
  // managing view state within this component if it were session-aware itself.
  // For now, let's assume parent will manage calling these on the ref if needed.
  // No direct prop for this, but an imperative handle could expose it.
}

export interface MonacoEditorRef {
  getViewState: () => editor.ICodeEditorViewState | null;
  restoreViewState: (state: editor.ICodeEditorViewState) => void;
  focus: () => void;
}

const DefaultMonacoEditor = React.forwardRef<MonacoEditorRef, MonacoEditorProps>(({
  value: initialValueFromProps = '',
  language = 'javascript',
  theme = 'vs-dark',
  readOnly = false,
  onChange,
  onSave,
  editorDidMount,
  filePath,
  onScroll,
}, ref) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const dbRef = useRef<IDBDatabase | undefined>(undefined);
  const lastSavedViewState = useRef<editor.ICodeEditorViewState | null>(null);
  const [internalValue, setInternalValue] = useState(initialValueFromProps);
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(true);

  // Debounced save to IndexedDB
  const debouncedSaveToDb = useCallback(
    debounce(async (path: string, content: string) => {
      if (dbRef.current && path) {
        try {
          await setEditorContent(dbRef.current, path, content);
          logger.log(`Content saved to IndexedDB for ${path}`);
        } catch (error) {
          logger.error(`Error saving content to IndexedDB for ${path}:`, error);
        }
      }
    }, 1000), // Save after 1 second of inactivity
    [] // dbRef will be stable once set
  );


  const handleEditorDidMount = async (
    mountedEditor: editor.IStandaloneCodeEditor,
    monacoInstance: Monaco
  ) => {
    editorRef.current = mountedEditor;
    monacoRef.current = monacoInstance;

    // Open DB
    if (!dbRef.current) {
      dbRef.current = await openDatabase();
    }

    // Load content from IndexedDB if filePath is provided
    if (filePath && dbRef.current) {
      try {
        const savedContent = await getEditorContent(dbRef.current, filePath);
        if (savedContent !== undefined) {
          logger.log(`Content loaded from IndexedDB for ${filePath}`);
          // Check if props value is newer (e.g. file reloaded from disk)
          // For now, prioritize IndexedDB content if available
          mountedEditor.setValue(savedContent);
          setInternalValue(savedContent); // Sync internal state
        } else {
           // If no content in DB, use prop value
          mountedEditor.setValue(initialValueFromProps);
          setInternalValue(initialValueFromProps);
        }
      } catch (error) {
        logger.error(`Error loading content from IndexedDB for ${filePath}:`, error);
        mountedEditor.setValue(initialValueFromProps); // Fallback to prop value
        setInternalValue(initialValueFromProps);
      }
    } else {
      mountedEditor.setValue(initialValueFromProps); // No filePath or DB, use prop value
      setInternalValue(initialValueFromProps);
    }
    setIsLoadingFromDb(false);


    mountedEditor.updateOptions({ readOnly });

    if (onSave) {
      mountedEditor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
        onSave();
      });
    }

    if (onScroll) {
        mountedEditor.onDidScrollChange((e) => {
            if (e.scrollTopChanged || e.scrollLeftChanged) {
                onScroll(mountedEditor.getScrollTop(), mountedEditor.getScrollLeft());
            }
        });
    }

    if (editorDidMount) {
      editorDidMount(mountedEditor, monacoInstance);
    }

    // If there was a view state trying to be restored before editor mounted
    if(lastSavedViewState.current) {
      mountedEditor.restoreViewState(lastSavedViewState.current);
      lastSavedViewState.current = null; // Clear after restoring
    }
  };

  useImperativeHandle(ref, () => ({
    getViewState: () => {
      return editorRef.current ? editorRef.current.saveViewState() : null;
    },
    restoreViewState: (state: editor.ICodeEditorViewState) => {
      if (editorRef.current) {
        editorRef.current.restoreViewState(state);
      } else {
        // If editor not mounted yet, store it to restore on mount
        lastSavedViewState.current = state;
      }
    },
    focus: () => {
      editorRef.current?.focus();
    }
  }));

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ readOnly });
    }
  }, [readOnly]);

  // Effect to handle external value changes (e.g. file loaded from disk)
  // This needs careful handling to avoid conflicts with IndexedDB loading and user edits.
  useEffect(() => {
    // Only update if not loading from DB and prop value is different from internal state
    if (!isLoadingFromDb && initialValueFromProps !== internalValue) {
      if (editorRef.current && editorRef.current.getValue() !== initialValueFromProps) {
        // Prefer prop value if it changes after initial load, assuming it's a "fresh" version
        editorRef.current.setValue(initialValueFromProps);
        setInternalValue(initialValueFromProps);
      }
    }
  }, [initialValueFromProps, isLoadingFromDb]);


  const handleOnChange = (newValue: string, event: editor.IModelContentChangedEvent) => {
    if (isLoadingFromDb) return; // Don't process changes while loading initial content

    setInternalValue(newValue); // Update internal state immediately

    if (onChange) {
      onChange(newValue, event);
    }
    if (filePath && !readOnly) { // Only save if filePath exists and not readOnly
      debouncedSaveToDb(filePath, newValue);
    }
  };

  if (isLoadingFromDb && filePath) { // Show loading indicator if filePath is provided
    return <div>Loading editor content...</div>;
  }

  return (
    <MonacoEditor
      height="100%"
      language={language}
      theme={theme}
      value={internalValue} // Controlled by internalValue state
      options={{
        selectOnLineNumbers: true,
        automaticLayout: true,
        minimap: {
          enabled: true,
        },
        // readOnly is handled by updateOptions effect
        // contextmenu: false,
        tabSize: 2, // Default tab size
      }}
      onChange={handleOnChange}
      editorDidMount={handleEditorDidMount}
    />
  );
};

export default DefaultMonacoEditor;
