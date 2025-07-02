import type * as monaco from 'monaco-editor';
import { getActiveMonacoInstance } from '~/lib/editor/editorUtils';
import { editorStore } from '~/lib/stores/editor';
import { AgentEngine } from '../engine/AgentEngine'; // Import AgentEngine

const logger = console;

export interface EditorContext {
  filePath: string | undefined;
  content: string | undefined;
  language: string | undefined;
  cursorOffset: number | undefined; // Character offset from the start of the document
  cursorPosition: monaco.Position | undefined; // Line and column
  selectedText: string | undefined;
  fullFileContent: string | undefined; // Alias for content for clarity in some contexts
}

export type PromptType =
  | 'explain'
  | 'fix'
  | 'refactor'
  | 'add-tests'
  | 'generate'
  | 'custom_prompt';

// Placeholder for AgentEngine response structure
export interface AgentResponse {
  message: string;
  edit?: {
    newCode: string;
  };
  error?: string;
}

export class EditorAgentBridge {
  private agentEngine: AgentEngine;

  constructor(agentEngine?: AgentEngine) { // AgentEngine can be optional for mock/default
    this.agentEngine = agentEngine || new AgentEngine(); // Use provided or default
    logger.info('EditorAgentBridge initialized.');
  }

  public getContext(): EditorContext {
    const editor = getActiveMonacoInstance();
    const activeFilePath = editorStore.activeFilePath.get(); // Get from the refactored store

    if (!editor || !activeFilePath) {
      logger.warn('EditorAgentBridge: No active editor instance or file path.');
      return {
        filePath: activeFilePath,
        content: undefined,
        language: undefined,
        cursorOffset: undefined,
        cursorPosition: undefined,
        selectedText: undefined,
        fullFileContent: undefined,
      };
    }

    const model = editor.getModel();
    if (!model) {
      logger.warn('EditorAgentBridge: No active model in editor.');
      return {
        filePath: activeFilePath,
        content: undefined,
        language: undefined,
        cursorOffset: undefined,
        cursorPosition: undefined,
        selectedText: undefined,
        fullFileContent: undefined,
      };
    }

    const position = editor.getPosition();
    const selection = editor.getSelection();
    const fullContent = model.getValue();

    return {
      filePath: activeFilePath,
      content: fullContent, // current content of the model
      language: model.getLanguageId(),
      cursorPosition: position || undefined,
      cursorOffset: position ? model.getOffsetAt(position) : undefined,
      selectedText: selection ? model.getValueInRange(selection) : undefined,
      fullFileContent: fullContent,
    };
  }

  public applyEdit(newCode: string): boolean {
    const editor = getActiveMonacoInstance();
    if (!editor) {
      logger.warn('EditorAgentBridge: No active editor instance to apply edit.');
      return false;
    }
    const model = editor.getModel();
    if (!model) {
      logger.warn('EditorAgentBridge: No active model to apply edit.');
      return false;
    }

    // Using setValue as requested for simplicity.
    // For better undo/redo and collaborative scenarios, executeEdits would be preferred.
    model.setValue(newCode);
    logger.info('EditorAgentBridge: Edit applied.');
    return true;
  }

  public async requestAgentAction(
    promptType: PromptType,
    customPromptText?: string, // For 'custom_prompt' type
    // additionalContext?: any // For future use, like passing specific ranges or nodes
  ): Promise<AgentResponse> {
    const context = this.getContext();

    if (!context.filePath && promptType !== 'generate') { // Generate might not need an existing file
      return { error: 'No active file context for this action.', message: '' };
    }

    let fullPrompt = `Editor Context:\nFile: ${context.filePath || 'N/A'}\nLanguage: ${context.language || 'N/A'}\n`;
    if (context.selectedText) {
      fullPrompt += `Selected Text:\n\`\`\`${context.language || ''}\n${context.selectedText}\n\`\`\`\n`;
    } else if (context.cursorPosition) {
      fullPrompt += `Cursor Position: Line ${context.cursorPosition.lineNumber}, Column ${context.cursorPosition.column}\n`;
    }

    fullPrompt += `\nTask: `;

    switch (promptType) {
      case 'explain':
        fullPrompt += `Explain the following code block or the code around the cursor.`;
        if (!context.selectedText && context.content) {
            // If no selection, maybe grab a snippet around the cursor or explain the whole file if small
            // For now, this will be handled by the AgentEngine with the full context.
        }
        break;
      case 'fix':
        fullPrompt += `Fix any errors or bugs in the following code block (or the full file content if no selection). Provide the corrected code.`;
        break;
      case 'refactor':
        fullPrompt += `Refactor the following code block (or the full file content if no selection) for clarity, performance, or best practices. Provide the refactored code.`;
        break;
      case 'add-tests':
        fullPrompt += `Generate unit tests for the following code block or file. Provide the test code.`;
        break;
      case 'generate':
        fullPrompt += `Generate code based on the following request: ${customPromptText || 'Generate a new code snippet.'}`;
        // For 'generate', selectedText might be less relevant unless it's a template.
        // The customPromptText is key here.
        break;
      case 'custom_prompt':
        if (!customPromptText) return { error: 'Custom prompt text is required.', message:'' };
        fullPrompt = customPromptText; // Use the custom prompt directly, but might prepend context
        // Prepending context for custom prompts too, so agent is aware.
        fullPrompt = `Editor Context:\nFile: ${context.filePath || 'N/A'}\nLanguage: ${context.language || 'N/A'}\nSelected Text: ${context.selectedText || 'N/A'}\n\nUser Prompt: ${customPromptText}`;
        break;
      default:
        return { error: `Unknown prompt type: ${promptType}`, message: '' };
    }

    logger.info(`EditorAgentBridge: Requesting action - Type: ${promptType}, Prompt (start): ${fullPrompt.substring(0, 100)}...`);

    // Call the actual AgentEngine
    if (!this.agentEngine) {
      logger.error("AgentEngine not initialized in EditorAgentBridge.");
      return { error: "AgentEngine not available.", message: "" };
    }

    // The agentEngine's execute method now takes promptType, context, and customPromptText
    const agentResponse: AgentResponse = await this.agentEngine.execute(
      promptType,
      context,
      customPromptText
    );

    // Process response
    if (agentResponse.edit && agentResponse.edit.newCode) {
      const success = this.applyEdit(agentResponse.edit.newCode);
      if (!success) {
        // Append to message if edit application failed
        agentResponse.message += "\n(Note: Applying edit to the editor failed.)";
      }
    }

    return agentResponse;
  }
}

// Export an instance if it's to be used as a singleton.
// This makes it easier to access from UI elements or other services.
// If multiple agent configurations are needed, this might change.
export const editorAgentBridge = new EditorAgentBridge();
