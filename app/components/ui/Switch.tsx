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
        'relative h-5 w-9 sm:h-6 sm:w-11 cursor-pointer rounded-full bg-bolt-elements-button-primary-background', // Responsive track size
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
          'block h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-white', // Responsive thumb size
          'shadow-lg shadow-black/20',
          'transition-transform duration-200 ease-in-out',
          // Responsive translation: translate-x-[1.5px] for base, translate-x-0.5 (2px) for sm
          // data-[state=checked]: translate-x-[1.15625rem] (18.5px) for base, translate-x-[1.375rem] (22px) for sm
          'translate-x-[1.5px] data-[state=checked]:translate-x-[1.15625rem]',
          'sm:translate-x-0.5 sm:data-[state=checked]:translate-x-[1.375rem]',
          'will-change-transform',
        )}
      />
    </SwitchPrimitive.Root>
  );
});
