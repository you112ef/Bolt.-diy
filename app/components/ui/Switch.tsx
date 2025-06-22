import { memo } from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { classNames } from '~/utils/classNames';

interface SwitchProps {
  className?: string;
  checked?: boolean;
  onCheckedChange?: (event: boolean) => void;
}

export const Switch = memo(({ className, onCheckedChange, checked }: SwitchProps) => {
  return (
    <SwitchPrimitive.Root
      className={classNames(
        'relative h-3.5 w-7 sm:h-6 sm:w-11 cursor-pointer rounded-full bg-bolt-elements-button-primary-background', // Base: h-3.5 (14px), w-7 (28px)
        'transition-colors duration-200 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-bolt-elements-item-contentAccent',
        className,
      )}
      checked={checked}
      onCheckedChange={(e) => onCheckedChange?.(e)}
    >
      <SwitchPrimitive.Thumb
        className={classNames(
          'block h-3 w-3 sm:h-5 sm:w-5 rounded-full bg-white', // Base: h-3 w-3 (12px)
          'shadow-lg shadow-black/20',
          'transition-transform duration-200 ease-in-out',
          // Base translation: translate-x-[1.5px], data-[state=checked]:translate-x-3.5 (14px)
          // SM translation: translate-x-0.5 (2px), data-[state=checked]:translate-x-[1.375rem] (22px)
          'translate-x-[1.5px] data-[state=checked]:translate-x-3.5',
          'sm:translate-x-0.5 sm:data-[state=checked]:translate-x-[1.375rem]',
          'will-change-transform',
        )}
      />
    </SwitchPrimitive.Root>
  );
});
