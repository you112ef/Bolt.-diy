import React, { useState, useCallback } from 'react';
import { Button } from '~/components/ui/Button';
import { Dialog, DialogRoot, DialogTitle, DialogClose } from '~/components/ui/Dialog'; // Assuming DialogClose is available or can be added
import { classNames } from '~/utils/classNames';
import { SectionHeader } from './SectionHeader'; // Using SectionHeader for dialog title consistency

export interface ExportFormatOption {
  id: string;
  label: string;
  icon: string; // Iconify class string
  handler: () => void;
  description?: string;
}

interface ExportButtonDialogProps {
  exportFormats: ExportFormatOption[];
  triggerButtonLabel?: string;
  triggerButtonVariant?: React.ComponentProps<typeof Button>['variant'];
  triggerButtonSize?: React.ComponentProps<typeof Button>['size'];
  triggerButtonClassName?: string;
  dialogTitle?: string;
  dialogIcon?: string; // Iconify class for dialog title
}

export const ExportButtonDialog: React.FC<ExportButtonDialogProps> = ({
  exportFormats,
  triggerButtonLabel = 'Export',
  triggerButtonVariant = 'outline',
  triggerButtonSize = 'sm',
  triggerButtonClassName,
  dialogTitle = 'Export Data',
  dialogIcon = 'i-ph:download-duotone',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  const handleFormatClick = useCallback((handler: () => void) => {
    handler();
    setIsOpen(false); // Close dialog after action
  }, []);

  return (
    <DialogRoot open={isOpen} onOpenChange={handleOpenChange}>
      <Button
        onClick={() => setIsOpen(true)}
        variant={triggerButtonVariant}
        size={triggerButtonSize}
        className={classNames(
          'flex items-center gap-1 sm:gap-2', // Responsive gap
          triggerButtonClassName,
        )}
      >
        <div className={classNames(dialogIcon, 'text-base sm:text-lg')} /> {/* Responsive icon */}
        {triggerButtonLabel}
      </Button>

      <Dialog showCloseButton> {/* Assumes Dialog handles its own responsive sizing */}
        <div className="p-3 sm:p-4 md:p-6"> {/* Responsive padding */}
          <DialogTitle className="mb-3 sm:mb-4"> {/* Use DialogTitle, SectionHeader might be too much here, DialogTitle is already responsive */}
            <div className={classNames(dialogIcon, "w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2")} />
            {dialogTitle}
          </DialogTitle>

          <div className="flex flex-col gap-1.5 sm:gap-2"> {/* Responsive gap */}
            {exportFormats.map((format) => (
              <button
                key={format.id}
                onClick={() => handleFormatClick(format.handler)}
                className={classNames(
                  'flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm rounded-md sm:rounded-lg transition-colors w-full text-left',
                  'bg-white dark:bg-bolt-elements-background-depth-1', // Slightly different bg for items
                  'border border-bolt-elements-borderColor',
                  'hover:bg-purple-50 dark:hover:bg-purple-500/10',
                  'hover:border-purple-200 dark:hover:border-purple-500/20',
                  'text-bolt-elements-textPrimary focus-visible:ring-2 focus-visible:ring-purple-500 focus:outline-none',
                )}
              >
                <div className={classNames(format.icon, 'w-4 h-4 sm:w-5 sm:h-5 text-purple-500')} /> {/* Responsive icon */}
                <div>
                  <div className="font-medium">{format.label}</div>
                  {format.description && (
                    <div className="text-[10px] sm:text-xs text-bolt-elements-textSecondary mt-0.5"> {/* Responsive text */}
                      {format.description}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
           <div className="mt-4 sm:mt-6 flex justify-end">
            <DialogClose asChild>
                <Button variant="outline" size="sm">Close</Button>
            </DialogClose>
           </div>
        </div>
      </Dialog>
    </DialogRoot>
  );
};
