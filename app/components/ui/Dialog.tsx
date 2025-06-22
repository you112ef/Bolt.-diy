import * as RadixDialog from '@radix-ui/react-dialog';
import { motion, type Variants } from 'framer-motion';
import React, { memo, type ReactNode, useState, useEffect } from 'react';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { IconButton } from './IconButton';
import { Button } from './Button';
import { FixedSizeList } from 'react-window';
import { Checkbox } from './Checkbox';
import { Label } from './Label';

export { Close as DialogClose, Root as DialogRoot } from '@radix-ui/react-dialog';

interface DialogButtonProps {
  type: 'primary' | 'secondary' | 'danger';
  children: ReactNode;
  onClick?: (event: React.MouseEvent) => void;
  disabled?: boolean;
}

export const DialogButton = memo(({ type, children, onClick, disabled }: DialogButtonProps) => {
  return (
    <button
      className={classNames(
        'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors', // Base: gap-1, px-2, py-1, rounded-md, text-xs
        'sm:gap-2 sm:px-4 sm:py-2 sm:rounded-lg sm:text-sm', // SM screens and up
        type === 'primary'
          ? 'bg-purple-500 text-white hover:bg-purple-600 dark:bg-purple-500 dark:hover:bg-purple-600'
          : type === 'secondary'
            ? 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
            : 'bg-transparent text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10',
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
});

export const DialogTitle = memo(({ className, children, ...props }: RadixDialog.DialogTitleProps) => {
  return (
    <RadixDialog.Title
      className={classNames(
        'text-sm sm:text-lg font-medium text-bolt-elements-textPrimary flex items-center gap-1 sm:gap-2', // Base: text-sm. SM and up: text-lg, gap-2
        className,
      )}
      {...props}
    >
      {children}
    </RadixDialog.Title>
  );
});

export const DialogDescription = memo(({ className, children, ...props }: RadixDialog.DialogDescriptionProps) => {
  return (
    <RadixDialog.Description
      className={classNames('text-xs sm:text-sm text-bolt-elements-textSecondary mt-1', className)} // Responsive adjustments
      {...props}
    >
      {children}
    </RadixDialog.Description>
  );
});

const transition = {
  duration: 0.15,
  ease: cubicEasingFn,
};

export const dialogBackdropVariants = {
  closed: {
    opacity: 0,
    transition,
  },
  open: {
    opacity: 1,
    transition,
  },
} satisfies Variants;

export const dialogVariants = {
  closed: {
    x: '-50%',
    y: '-40%',
    scale: 0.96,
    opacity: 0,
    transition,
  },
  open: {
    x: '-50%',
    y: '-50%',
    scale: 1,
    opacity: 1,
    transition,
  },
} satisfies Variants;

interface DialogProps {
  children: ReactNode;
  className?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  onBackdrop?: () => void;
}

export const Dialog = memo(({ children, className, showCloseButton = true, onClose, onBackdrop }: DialogProps) => {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay asChild>
        <motion.div
          className={classNames('fixed inset-0 z-[9999] bg-black/70 dark:bg-black/80 backdrop-blur-sm')}
          initial="closed"
          animate="open"
          exit="closed"
          variants={dialogBackdropVariants}
          onClick={onBackdrop}
        />
      </RadixDialog.Overlay>
      <RadixDialog.Content asChild>
        <motion.div
          className={classNames(
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-950 rounded-lg shadow-xl border border-bolt-elements-borderColor z-[9999]',
            'w-[90vw] sm:w-[520px] max-h-[90vh]', // Responsive width and max height
            'focus:outline-none flex flex-col', // Added flex-col here for overflow to work correctly with children
            className,
          )}
          initial="closed"
          animate="open"
          exit="closed"
          variants={dialogVariants}
        >
          {/* Apply overflow to an inner container if direct children need to scroll, or manage scrolling within child components */}
          <div className="flex-1 overflow-y-auto"> {/* Inner scrollable container */}
            {children}
          </div>
          {showCloseButton && (
            <RadixDialog.Close asChild onClick={onClose}>
              <IconButton
                icon="i-ph:x" // IconButton itself needs responsive sizing
                className="absolute top-2 right-2 sm:top-3 sm:right-3 text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary" // Adjusted position slightly for smaller screens
              />
            </RadixDialog.Close>
          )}
        </motion.div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
});

/**
 * Props for the ConfirmationDialog component
 */
export interface ConfirmationDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;

  /**
   * Callback when the dialog is closed
   */
  onClose: () => void;

  /**
   * Callback when the confirm button is clicked
   */
  onConfirm: () => void;

  /**
   * The title of the dialog
   */
  title: string;

  /**
   * The description of the dialog
   */
  description: string;

  /**
   * The text for the confirm button
   */
  confirmLabel?: string;

  /**
   * The text for the cancel button
   */
  cancelLabel?: string;

  /**
   * The variant of the confirm button
   */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';

  /**
   * Whether the confirm button is in a loading state
   */
  isLoading?: boolean;
}

/**
 * A reusable confirmation dialog component that uses the Dialog component
 */
export function ConfirmationDialog({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  isLoading = false,
  onConfirm,
}: ConfirmationDialogProps) {
  return (
    <RadixDialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog showCloseButton={false}>
        {/* Base padding p-2, description margin mb-1.5 */}
        <div className="p-2 sm:p-4 md:p-6 bg-white dark:bg-gray-950 relative z-10">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="mb-1.5 sm:mb-4">{description}</DialogDescription> {/* Base mb-1.5 */}
          {/* Responsive spacing for buttons, base space-x-1 */}
          <div className="flex justify-end space-x-1 sm:space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading} size="sm"> {/* Explicitly use new sm Button size */}
              {cancelLabel}
            </Button>
            <Button
              variant={variant}
              onClick={onConfirm}
              disabled={isLoading}
              size="sm" // Explicitly use new sm Button size
              className={
                variant === 'destructive'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent hover:bg-bolt-elements-button-primary-backgroundHover'
              }
            >
              {isLoading ? (
                <>
                  {/* Base icon size w-3 h-3, mr-1 */}
                  <div className="i-ph-spinner-gap-bold animate-spin w-3 h-3 mr-1 sm:w-4 sm:h-4 sm:mr-2" />
                  {confirmLabel}
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </RadixDialog.Root>
  );
}

/**
 * Type for selection item in SelectionDialog
 */
type SelectionItem = {
  id: string;
  label: string;
  description?: string;
};

/**
 * Props for the SelectionDialog component
 */
export interface SelectionDialogProps {
  /**
   * The title of the dialog
   */
  title: string;

  /**
   * The items to select from
   */
  items: SelectionItem[];

  /**
   * Whether the dialog is open
   */
  isOpen: boolean;

  /**
   * Callback when the dialog is closed
   */
  onClose: () => void;

  /**
   * Callback when the confirm button is clicked with selected item IDs
   */
  onConfirm: (selectedIds: string[]) => void;

  /**
   * The text for the confirm button
   */
  confirmLabel?: string;

  /**
   * The maximum height of the selection list
   */
  maxHeight?: string;
}

/**
 * A reusable selection dialog component that uses the Dialog component
 */
export function SelectionDialog({
  title,
  items,
  isOpen,
  onClose,
  onConfirm,
  confirmLabel = 'Confirm',
  maxHeight = '60vh', // Keep as string for style prop
}: SelectionDialogProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Reset selected items when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedItems([]);
      setSelectAll(false);
    }
  }, [isOpen]);

  const handleToggleItem = (id: string) => {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
      setSelectAll(false);
    } else {
      setSelectedItems(items.map((item) => item.id));
      setSelectAll(true);
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedItems);
    onClose();
  };

  // Item size for FixedSizeList - base 40px
  const itemSize = typeof window !== 'undefined' && window.innerWidth < 640 ? 40 : 60; // 40px for base, 60px for sm+

  // Calculate the height for the virtualized list
  const listHeight = Math.min(
    items.length * itemSize, // Use responsive itemSize
    // Ensure maxHeight is treated as a number for calculation if it's a vh unit
    typeof maxHeight === 'string' && maxHeight.endsWith('vh')
      ? (parseInt(maxHeight.replace('vh', '')) / 100) * window.innerHeight - 40 // Approximation
      : typeof maxHeight === 'number'
        ? maxHeight - 40
        : 300, // fallback height
  );

  // Render each item in the virtualized list
  const ItemRenderer = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index];
    return (
      <div
        key={item.id}
        className={classNames(
          'flex items-start space-x-1.5 sm:space-x-2 md:space-x-3 p-1.5 sm:p-2 rounded-md transition-colors', // Responsive padding and spacing
          selectedItems.includes(item.id)
            ? 'bg-bolt-elements-item-backgroundAccent'
            : 'bg-bolt-elements-bg-depth-2 hover:bg-bolt-elements-item-backgroundActive',
        )}
        style={{
          ...style,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <Checkbox
          id={`item-${item.id}`}
          checked={selectedItems.includes(item.id)}
          onCheckedChange={() => handleToggleItem(item.id)}
          // Checkbox component itself should be responsive (h-3 w-3 sm:h-4 sm:w-4 from previous changes if applied)
        />
        <div className="grid gap-1 sm:gap-1.5 leading-none">
          <Label
            htmlFor={`item-${item.id}`}
            className={classNames(
              'text-xs sm:text-sm font-medium cursor-pointer', // Responsive text
              selectedItems.includes(item.id)
                ? 'text-bolt-elements-item-contentAccent'
                : 'text-bolt-elements-textPrimary',
            )}
          >
            {item.label}
          </Label>
          {item.description && <p className="text-xs text-bolt-elements-textSecondary">{item.description}</p>}
        </div>
      </div>
    );
  };

  return (
    <RadixDialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog showCloseButton={false}>
        {/* Base padding p-2 */}
        <div className="p-2 sm:p-4 md:p-6 bg-white dark:bg-gray-950 relative z-10">
          <DialogTitle>{title}</DialogTitle>
          {/* Base margins mt-0.5 mb-1.5 */}
          <DialogDescription className="mt-0.5 mb-1.5 sm:mt-2 sm:mb-4">
            Select the items you want to include and click{' '}
            <span className="text-bolt-elements-item-contentAccent font-medium">{confirmLabel}</span>.
          </DialogDescription>

          {/* Base padding py-1.5, margin mb-1.5 */}
          <div className="py-1.5 sm:py-4">
            <div className="flex items-center justify-between mb-1.5 sm:mb-4">
              <span className="text-xs sm:text-sm font-medium text-bolt-elements-textSecondary">
                {selectedItems.length} of {items.length} selected
              </span>
              <Button
                variant="ghost"
                size="sm" // Uses new scaled sm size (base h-5 px-1.5)
                onClick={handleSelectAll}
                className="text-bolt-elements-textPrimary hover:text-bolt-elements-item-contentAccent hover:bg-bolt-elements-item-backgroundAccent bg-bolt-elements-bg-depth-2 dark:bg-transparent"
              >
                {selectAll ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <div
              className="pr-0.5 sm:pr-2 border rounded-md border-bolt-elements-borderColor bg-bolt-elements-bg-depth-2" // Base pr-0.5
              style={{
                maxHeight,
              }}
            >
              {items.length > 0 ? (
                <FixedSizeList
                  height={listHeight}
                  width="100%"
                  itemCount={items.length}
                  itemSize={itemSize}
                  className="scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-bolt-elements-bg-depth-3"
                >
                  {ItemRenderer}
                </FixedSizeList>
              ) : (
                <div className="text-center py-2 sm:py-4 text-xs sm:text-sm text-bolt-elements-textTertiary"> {/* Base py-2 */}
                  No items to display
                </div>
              )}
            </div>
          </div>

          {/* Base margin mt-2 */}
          <div className="flex justify-between mt-2 sm:mt-4 md:mt-6">
            <Button
              variant="outline"
              size="sm" // Use new scaled sm size
              onClick={onClose}
              className="border-bolt-elements-borderColor text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              size="sm" // Use new scaled sm size
              disabled={selectedItems.length === 0}
              className="bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-50 disabled:pointer-events-none"
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </Dialog>
    </RadixDialog.Root>
  );
}
