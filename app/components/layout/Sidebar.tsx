import React, { useState } from 'react';
import { IconButton } from '~/components/ui/IconButton'; // Assuming IconButton
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/Tooltip'; // Assuming Tooltip

export type MainTool = 'chat' | 'workbench' | 'search' | 'settings';

interface SidebarProps {
  activeTool: MainTool;
  onToolSelect: (tool: MainTool) => void;
}

const tools: Array<{ id: MainTool; label: string; icon: string }> = [
  { id: 'chat', label: 'Chat', icon: 'i-ph:chat-circle-dots-duotone' },
  { id: 'workbench', label: 'Workbench (Editor & Terminal)', icon: 'i-ph:code-block-duotone' },
  { id: 'search', label: 'Web Search', icon: 'i-ph:magnifying-glass-duotone' },
  // { id: 'settings', label: 'Settings', icon: 'i-ph:gear-duotone' }, // Settings can be added later
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTool, onToolSelect }) => {
  return (
    <aside className="flex flex-col items-center w-16 bg-bolt-elements-background-depth-2 p-2 space-y-3 border-r border-bolt-elements-borderColor">
      <TooltipProvider delayDuration={100}>
        {tools.map((tool) => (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <IconButton
                variant={activeTool === tool.id ? 'solid' : 'ghost'}
                color={activeTool === tool.id ? 'primary' : 'default'}
                onClick={() => onToolSelect(tool.id)}
                aria-label={tool.label}
                aria-pressed={activeTool === tool.id}
                className="p-2.5 rounded-lg"
              >
                <div className={`${tool.icon} text-2xl`} />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{tool.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>

      {/* Spacer to push settings to the bottom, if added */}
      {/* <div className="flex-grow" /> */}
      {/* Example for settings if added later:
      <Tooltip>
        <TooltipTrigger asChild>
          <IconButton
            variant={activeTool === 'settings' ? 'solid' : 'ghost'}
            color={activeTool === 'settings' ? 'primary' : 'default'}
            onClick={() => onToolSelect('settings')}
            aria-label="Settings"
            className="p-2.5 rounded-lg"
          >
            <div className="i-ph:gear-duotone text-2xl" />
          </IconButton>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Settings</p>
        </TooltipContent>
      </Tooltip>
      */}
    </aside>
  );
};

// Store for managing the active tool view
import { atom, type WritableAtom } from 'nanostores';
export const activeToolStore: WritableAtom<MainTool> = atom('chat'); // Default to chat view
