import type * as monaco from 'monaco-editor';
import { getActiveMonacoInstance } from '~/lib/editor/editorUtils';
import { editorStore } from '~/lib/stores/editor'; // To get activeFilePath
// Import AgentEngine when it's created
// import { AgentEngine, AgentResponse } from '../engine/AgentEngine';

const logger = console; // Or use a proper logger

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
  // private agentEngine: AgentEngine; // Will be initialized once AgentEngine is ready

  constructor(/* agentEngine: AgentEngine */) {
    // this.agentEngine = agentEngine;
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

    // --- Placeholder for AgentEngine call ---
    // if (!this.agentEngine) {
    //   logger.error("AgentEngine not initialized in EditorAgentBridge.");
    //   return { error: "AgentEngine not available.", message: "" };
    // }
    // const agentResponse: AgentResponse = await this.agentEngine.execute(fullPrompt, context);

    // Mock/Simulated Agent Response for now:
    let mockResponse: AgentResponse;
    if (promptType === 'fix' || promptType === 'refactor' || promptType === 'generate' && promptType !== 'add-tests') {
      const prefix = promptType === 'fix' ? 'FIXED:\n' : promptType === 'refactor' ? 'REFACTORED:\n' : 'GENERATED:\n';
      const codeToEdit = context.selectedText || context.fullFileContent || '';
      mockResponse = {
        message: `${prefix}${codeToEdit}`,
        edit: { newCode: `${prefix}${codeToEdit}` }
      };
    } else if (promptType === 'add-tests') {
        mockResponse = {
            message: `// Test suite for ${context.filePath || 'the code'}\ndescribe('tests', () => { it('should pass', () => expect(true).toBe(true)); });`,
            // Typically, tests are new files or appended, not replacing current content unless specified.
            // For now, let's assume it might suggest placing it in a new file or a specific spot.
        };
    }
    else {
      mockResponse = { message: `Agent explained: ${context.selectedText || 'the current code context.'}` };
    }
    // --- End of Placeholder ---

    // Process response
    if (mockResponse.edit && mockResponse.edit.newCode) {
      this.applyEdit(mockResponse.edit.newCode);
    }

    return mockResponse;
  }
}

// Export an instance if it's to be used as a singleton, or allow instantiation
// For now, let's make it instantiable, to be managed by a higher-level agent service.
// export const editorAgentBridge = new EditorAgentBridge(/* pass agentEngine when ready */);
