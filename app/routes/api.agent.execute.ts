import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import OpenAI from 'openai';
import type { EditorContext, PromptType, AgentResponse } from '~/agents/bridge/EditorAgentBridge';
import { getSystemPrompt } from '~/lib/common/prompts/prompts'; // Assuming this can be used server-side

const logger = console; // Basic logger

async function getOpenAICompletion(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessages: Array<{role: "user" | "assistant" | "system", content: string }>
): Promise<string | null> {
  const openai = new OpenAI({ apiKey });
  try {
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [{ role: 'system', content: systemPrompt }, ...userMessages],
      // temperature: 0.7, // Adjust as needed
      // max_tokens: 1024, // Adjust as needed
    });
    return completion.choices[0]?.message?.content?.trim() || null;
  } catch (error) {
    logger.error('OpenAI API call failed:', error);
    throw error; // Re-throw to be caught by the action handler
  }
}

// Simple parser to extract code from ```language ... ``` blocks or a JSON edit block
function parseLLMResponseForEdit(responseText: string, language?: string): { message: string; edit?: { newCode: string } } {
  // Try to find a JSON edit block first
  const jsonEditRegex = /```json\s*{\s*"edit":\s*"([\s\S]*?)"\s*}\s*```/s;
  const jsonMatch = responseText.match(jsonEditRegex);
  if (jsonMatch && jsonMatch[1]) {
    try {
      // The captured group is a string that itself needs to be unescaped if it contains escaped quotes etc.
      // For simplicity, assuming it's a clean string for now.
      const newCode = JSON.parse(`"${jsonMatch[1]}"`); // This handles escaped characters in the string
      const message = responseText.replace(jsonEditRegex, '').trim();
      return { message, edit: { newCode } };
    } catch (e) {
      logger.warn("Failed to parse JSON edit block, falling back to language block parsing", e);
    }
  }

  // Fallback to language-specific code block
  const lang = language || 'javascript'; // Default or use context language
  const codeBlockRegex = new RegExp("```(?:" + lang + ")?\\s*([\\s\\S]*?)\\s*```", "s");
  const match = responseText.match(codeBlockRegex);

  if (match && match[1]) {
    const newCode = match[1].trim();
    const message = responseText.replace(codeBlockRegex, '').trim(); // Message is what's outside the code block
    return { message, edit: { newCode } };
  }
  // If no specific code block, assume the whole response might be an explanation or a message.
  return { message: responseText };
}


export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { OPENAI_API_KEY } = context.cloudflare.env;

  if (!OPENAI_API_KEY) {
    logger.error('OPENAI_API_KEY not configured in server environment.');
    return json({ error: 'AI service not configured on the server.' }, { status: 500 });
  }

  try {
    const payload = await request.json();
    const { promptType, editorContext, customPromptText } = payload as {
      promptType: PromptType;
      editorContext: EditorContext;
      customPromptText?: string;
    };

    if (!promptType || !editorContext) {
      return json({ error: 'Missing promptType or editorContext' }, { status: 400 });
    }

    // Construct a detailed prompt for the LLM based on type and context
    // This is a simplified version; actual prompt engineering would be more nuanced.
    let taskSpecificPrompt = "";
    const mainContentForPrompt = editorContext.selectedText || editorContext.fullFileContent || "";

    switch (promptType) {
      case 'explain':
        taskSpecificPrompt = `Explain the following code snippet from ${editorContext.filePath || 'the current file'} (language: ${editorContext.language || 'unknown'}):\n\n\`\`\`${editorContext.language || ''}\n${mainContentForPrompt}\n\`\`\``;
        break;
      case 'fix':
        taskSpecificPrompt = `The following code from ${editorContext.filePath || 'the current file'} (language: ${editorContext.language || 'unknown'}) may have errors. Please provide a fixed version. If you provide code, wrap it in \`\`\`${editorContext.language || ''} ... \`\`\` or a JSON block like \`\`\`json\n{\"edit\": \"YOUR_CODE_HERE\"}\n\`\`\`.\n\nCode:\n\`\`\`${editorContext.language || ''}\n${mainContentForPrompt}\n\`\`\``;
        break;
      case 'refactor':
        taskSpecificPrompt = `Refactor the following code from ${editorContext.filePath || 'the current file'} (language: ${editorContext.language || 'unknown'}) for clarity, performance, or best practices. Provide the refactored code. If you provide code, wrap it in \`\`\`${editorContext.language || ''} ... \`\`\` or a JSON block like \`\`\`json\n{\"edit\": \"YOUR_CODE_HERE\"}\n\`\`\`.\n\nCode:\n\`\`\`${editorContext.language || ''}\n${mainContentForPrompt}\n\`\`\``;
        break;
      case 'add-tests':
        taskSpecificPrompt = `Generate unit tests for the following code from ${editorContext.filePath || 'the current file'} (language: ${editorContext.language || 'unknown'}). Provide the test code, ideally in a separate block. If you provide code, wrap it in \`\`\`${editorContext.language || ''} ... \`\`\` or a JSON block like \`\`\`json\n{\"edit\": \"YOUR_TEST_CODE_HERE\"}\n\`\`\`.\n\nCode to test:\n\`\`\`${editorContext.language || ''}\n${mainContentForPrompt}\n\`\`\``;
        break;
      case 'generate':
        taskSpecificPrompt = `Generate code based on the following request: "${customPromptText || 'Generate a new code snippet.'}" Context: file ${editorContext.filePath || 'new file'}, language ${editorContext.language || 'unknown'}. If you provide code, wrap it in \`\`\`${editorContext.language || ''} ... \`\`\` or a JSON block like \`\`\`json\n{\"edit\": \"YOUR_GENERATED_CODE_HERE\"}\n\`\`\`.`;
        break;
      case 'custom_prompt':
        taskSpecificPrompt = customPromptText || "Please respond to the current context.";
        // Could add more context here if needed for custom prompts
        // For example: `Context: File ${editorContext.filePath}, Selection: ${editorContext.selectedText}\n\nUser prompt: ${customPromptText}`
        break;
      default:
        return json({ error: `Unsupported prompt type: ${promptType}` }, { status: 400 });
    }

    // Using a simplified system prompt for now.
    // In a real scenario, getSystemPrompt() might need to be adapted or parts of it used.
    // The full getSystemPrompt() is very long and might be too much for every call.
    // A more targeted system message for the agent's role might be better.
    const systemPrompt = "You are an expert AI pair programmer. When asked to provide code, make sure the code is the primary part of your response, enclosed in appropriate markdown code blocks (e.g., ```language ... ```) or a JSON structure like ```json\n{\"edit\": \"YOUR_CODE_HERE\"}\n```. Any explanations should be brief and outside these code blocks.";

    const userMessages = [{ role: 'user' as const, content: taskSpecificPrompt }];

    // For now, using a default OpenAI model. This could come from payload.config.model
    const modelToUse = "gpt-3.5-turbo"; // Or "gpt-4", etc.

    const llmResponseText = await getOpenAICompletion(OPENAI_API_KEY as string, modelToUse, systemPrompt, userMessages);

    if (!llmResponseText) {
      return json({ error: 'Failed to get a response from AI model.', message: '' }, { status: 500 });
    }

    const parsedResponse = parseLLMResponseForEdit(llmResponseText, editorContext.language);

    return json(parsedResponse);

  } catch (error: any) {
    logger.error('Error in /api/agent/execute action:', error);
    return json({ error: 'Internal server error', details: error.message, message: '' }, { status: 500 });
  }
}
