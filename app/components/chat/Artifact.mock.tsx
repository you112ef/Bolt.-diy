// app/components/chat/Artifact.mock.tsx
import React from 'react';

interface MockArtifactProps {
  messageId: string;
  // Add any other props that <ArtifactComponent /> might receive in Markdown.tsx
  // to prevent type errors, even if the mock doesn't use them.
}

export const Artifact: React.FC<MockArtifactProps> = ({ messageId }) => {
  // console.log(`[Mock Artifact] Rendering for messageId: ${messageId}`);
  return (
    <div data-testid="mock-artifact" data-message-id={messageId}>
      <p>Mocked Artifact for: {messageId}</p>
    </div>
  );
};

export default Artifact; // Default export for easier conditional require
