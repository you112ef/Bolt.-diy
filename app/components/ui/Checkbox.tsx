import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { classNames } from '~/utils/classNames';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={classNames(
      'peer h-3 w-3 sm:h-4 sm:w-4 shrink-0 rounded-sm border transition-colors', // Responsive default size for the box
      'bg-transparent dark:bg-transparent',
      'border-gray-400 dark:border-gray-600',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:ring-purple-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-purple-500 dark:data-[state=checked]:bg-purple-500',
      'data-[state=checked]:border-purple-500 dark:data-[state=checked]:border-purple-500',
      'data-[state=checked]:text-white',
      className, // User-passed className can override the default h-N w-N
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      {/* Responsive check mark, slightly smaller than the box */}
      <Check className="h-2 w-2 sm:h-3 sm:w-3" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = 'Checkbox';

export { Checkbox };
