import { memo, Fragment } from 'react';
import { Markdown } from './Markdown';
import type { JSONValue } from 'ai';
import Popover from '~/components/ui/Popover';
import { workbenchStore } from '~/lib/stores/workbench';
import { WORK_DIR } from '~/utils/constants';
import WithTooltip from '~/components/ui/Tooltip';

interface AssistantMessageProps {
  content: string;
  annotations?: JSONValue[];
  messageId?: string;
  onRewind?: (messageId: string) => void;
  onFork?: (messageId: string) => void;
}

function openArtifactInWorkbench(filePath: string) {
  filePath = normalizedFilePath(filePath);

  if (workbenchStore.currentView.get() !== 'code') {
    workbenchStore.currentView.set('code');
  }

  workbenchStore.setSelectedFile(`${WORK_DIR}/${filePath}`);
}

function normalizedFilePath(path: string) {
  let normalizedPath = path;

  if (normalizedPath.startsWith(WORK_DIR)) {
    normalizedPath = path.replace(WORK_DIR, '');
  }

  if (normalizedPath.startsWith('/')) {
    normalizedPath = normalizedPath.slice(1);
  }

  return normalizedPath;
}

export const AssistantMessage = memo(({ content, annotations, messageId, onRewind, onFork }: AssistantMessageProps) => {
  const filteredAnnotations = (annotations?.filter(
    (annotation: JSONValue) => annotation && typeof annotation === 'object' && Object.keys(annotation).includes('type'),
  ) || []) as { type: string; value: any } & { [key: string]: any }[];

  let chatSummary: string | undefined = undefined;

  if (filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')) {
    chatSummary = filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')?.summary;
  }

  let codeContext: string[] | undefined = undefined;

  if (filteredAnnotations.find((annotation) => annotation.type === 'codeContext')) {
    codeContext = filteredAnnotations.find((annotation) => annotation.type === 'codeContext')?.files;
  }

  const usage: {
    completionTokens: number;
    promptTokens: number;
    totalTokens: number;
  } = filteredAnnotations.find((annotation) => annotation.type === 'usage')?.value;

  return (
    <div className="overflow-hidden w-full">
      <>
        {/* Base: text-xs, mb-1.5. Popover trigger icon size default (from IconButton scaling) */}
        <div className=" flex gap-1.5 sm:gap-2 items-center text-xs sm:text-sm text-bolt-elements-textSecondary mb-1.5 sm:mb-2">
          {(codeContext || chatSummary) && (
            <Popover side="right" align="start" trigger={<div className="i-ph:info" />}>
              {chatSummary && (
                <div className="max-w-chat"> {/* This max-w-chat might be too large for a popover on small screen, consider w-[90vw] or similar */}
                  <div className="summary max-h-64 sm:max-h-96 flex flex-col"> {/* Base max-h-64 */}
                    <h2 className="border border-bolt-elements-borderColor rounded-md p-2 sm:p-4 text-xs sm:text-sm">Summary</h2> {/* Base p-2, text-xs */}
                    <div style={{ zoom: 0.7 }} className="overflow-y-auto m-2 sm:m-4"> {/* Base m-2. Zoom kept for now */}
                      <Markdown>{chatSummary}</Markdown>
                    </div>
                  </div>
                  {codeContext && (
                    <div className="code-context flex flex-col p-2 sm:p-4 border border-bolt-elements-borderColor rounded-md"> {/* Base p-2 */}
                      <h2 className="text-xs sm:text-sm">Context</h2> {/* Base text-xs */}
                      <div className="flex gap-2 sm:gap-4 mt-2 sm:mt-4 bolt" style={{ zoom: 0.6 }}> {/* Base gap-2, mt-2. Zoom kept */}
                        {codeContext.map((x) => {
                          const normalized = normalizedFilePath(x);
                          return (
                            <Fragment key={normalized}>
                              {/* code tag: px-1 py-0.5 text-[10px] (from Markdown.module.scss $code-font-size) */}
                              <code
                                className="bg-bolt-elements-artifacts-inlineCode-background text-bolt-elements-artifacts-inlineCode-text px-1 py-0.5 sm:px-1.5 sm:py-1 rounded text-bolt-elements-item-contentAccent hover:underline cursor-pointer"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openArtifactInWorkbench(normalized);
                                }}
                              >
                                {normalized}
                              </code>
                            </Fragment>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="context"></div>
            </Popover>
          )}
          <div className="flex w-full items-center justify-between">
            {usage && (
              <div className="text-xs"> {/* Ensure this text is also xs */}
                Tokens: {usage.totalTokens} (prompt: {usage.promptTokens}, completion: {usage.completionTokens})
              </div>
            )}
            {(onRewind || onFork) && messageId && (
              <div className="flex gap-1.5 sm:gap-2 flex-col lg:flex-row ml-auto"> {/* Base gap-1.5 */}
                {onRewind && (
                  <WithTooltip tooltip="Revert to this message">
                    <button
                      onClick={() => onRewind(messageId)}
                      key="i-ph:arrow-u-up-left"
                      className="i-ph:arrow-u-up-left text-base sm:text-xl text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors" // Base text-base
                    />
                  </WithTooltip>
                )}
                {onFork && (
                  <WithTooltip tooltip="Fork chat from this message">
                    <button
                      onClick={() => onFork(messageId)}
                      key="i-ph:git-fork"
                      className="i-ph:git-fork text-base sm:text-xl text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors" // Base text-base
                    />
                  </WithTooltip>
                )}
              </div>
            )}
          </div>
        </div>
      </>
      <Markdown html>{content}</Markdown> {/* Markdown component handles its internal scaling */}
    </div>
  );
});
