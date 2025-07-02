import type { EditorContext, AgentResponse, PromptType } from '../bridge/EditorAgentBridge';
import { attivoUserStore } from '~/lib/stores/user'; // Assuming a user store for API keys or settings
import { getSystemPrompt } from '~/lib/common/prompts/prompts'; // To potentially pass parts or signals to backend

const logger = console; // Or use a proper logger

// This interface might be expanded based on what backend needs for provider selection
export interface AgentExecutionConfig {
  provider?: string; // e.g., 'openai', 'ollama', 'transformers_js'
  model?: string;
  // Other provider-specific configs could go here
}

export class AgentEngine {
  private userSettings: typeof attivoUserStore | undefined;

  constructor() {
    // In a real app, this might take a settings store or API key provider
    // For now, we'll assume API calls are proxied through a backend that handles keys.
    logger.info('AgentEngine initialized.');
    // Try to get user settings if available (e.g., for preferred model or client-side provider choice)
    // This is a placeholder, actual user settings/API key store needs to be defined and used.
    // If `attivoUserStore` is not the right store, this needs adjustment.
    // For now, this demonstrates where such config might come from.
    if (typeof window !== 'undefined') {
        // this.userSettings = require('~/lib/stores/user').attivoUserStore; // Placeholder
    }
  }

  public async execute(
    promptType: PromptType,
    context: EditorContext,
    customPromptText?: string,
  ): Promise<AgentResponse> {
    logger.info(`AgentEngine: Executing - Type: ${promptType}`);

    // Construct the payload for the backend
    // The backend will handle the detailed prompt construction using system prompts
    // and the provided context/task.
    const payload = {
      promptType,
      editorContext: context,
      customPromptText,
      // Potentially send user's preferred provider/model if stored client-side
      // config: this.userSettings ? this.userSettings.get().aiProviderConfig : undefined,
    };

    try {
      const response = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response from agent API.' }));
        logger.error('AgentEngine: API request failed', response.status, errorData);
        return {
          message: `Error from agent: ${errorData?.error || response.statusText}`,
          error: errorData?.error || response.statusText
        };
      }

      const result: AgentResponse = await response.json();
      return result;

    } catch (error: any) {
      logger.error('AgentEngine: Network or other error during execute', error);
      return {
        message: `Failed to communicate with agent: ${error.message}`,
        error: error.message,
      };
    }
  }
}

// Export an instance if it's to be used as a singleton
// export const agentEngine = new AgentEngine();
// For now, allow instantiation, to be managed by a higher-level service.
// This also allows different configurations if needed in the future.
