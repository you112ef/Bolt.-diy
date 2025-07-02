import type * as monaco from 'monaco-editor';

let activeEditorInstance: monaco.editor.IStandaloneCodeEditor | null = null;

/**
 * Sets the currently active Monaco editor instance.
 * This should be called by the editor component when it mounts or gains focus.
 * @param editor - The Monaco editor instance, or null if no editor is active.
 */
export function setActiveMonacoInstance(editor: monaco.editor.IStandaloneCodeEditor | null): void {
  activeEditorInstance = editor;
}

/**
 * Retrieves the currently active Monaco editor instance.
 * @returns The active Monaco editor instance, or null if none is set.
 */
export function getActiveMonacoInstance(): monaco.editor.IStandaloneCodeEditor | null {
  return activeEditorInstance;
}

/**
 * A type guard to check if the passed object is a Monaco editor instance.
 * This can be useful for type narrowing.
 * @param editor - The object to check.
 * @returns True if the object is a Monaco editor instance, false otherwise.
 */
export function isMonacoEditorInstance(editor: any): editor is monaco.editor.IStandaloneCodeEditor {
  return editor && typeof editor.getModel === 'function' && typeof editor.getPosition === 'function';
}
