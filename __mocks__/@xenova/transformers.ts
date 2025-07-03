// __mocks__/@xenova/transformers.ts
// This is a mock for the @xenova/transformers library.

export const pipeline = async (task: string, model?: string, options?: any): Promise<any> => {
  // console.log(`[Mocked @xenova/transformers] pipeline() called - task: ${task}, model: ${model}`);
  if (task === 'feature-extraction') {
    const mockPipelineInstance = async (text: string, pipeOptions?: any) => {
      // console.log(`[Mocked @xenova/transformers] feature-extraction pipeline processing: "${text}"`);
      return {
        data: new Float32Array(384).fill(0.0123), // Consistent mock embedding
        dims: [1, 384],
      };
    };
    return Promise.resolve(mockPipelineInstance);
  }
  return Promise.reject(new Error(`Mock pipeline task "${task}" not implemented.`));
};

// Mock other exports if needed by your application during tests
export const env = {
  allowLocalModels: true,
  allowRemoteModels: false,
  // ... any other env properties your code might access
};

// console.log('[@xenova/transformers mock file] Loaded mock for @xenova/transformers in __mocks__.');
