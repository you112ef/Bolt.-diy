// __mocks__/app/components/chat/Artifact.tsx
import React from 'react';

export const Artifact = ({ messageId }: { messageId: string }) => {
  // console.log(`[Mock Artifact] Rendering for messageId: ${messageId}`);
  return (
    <div data-testid="mock-artifact" data-message-id={messageId}>
      <p>Mocked Artifact Content for messageId: {messageId}</p>
      {/* Minimal structure, does not include ActionList or ShellCodeBlock
          as those might bring in their own complexities for this basic mock.
          If those are needed for Markdown.spec.ts to pass (unlikely), this mock would need expansion.
      */}
    </div>
  );
};

export default Artifact;
