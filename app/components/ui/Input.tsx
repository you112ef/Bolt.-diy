import { forwardRef } from 'react';
import { classNames } from '~/utils/classNames';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={classNames(
        'flex h-8 w-full rounded-md border border-bolt-elements-border bg-bolt-elements-background px-2 py-1.5 text-xs ring-offset-bolt-elements-background file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-bolt-elements-textSecondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bolt-elements-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        // Base: h-8 (32px), px-2 (8px), py-1.5 (6px), text-xs
        // SM screens and up will use Tailwind's default `sm:` variants if added, or inherit these if not.
        // For this pass, we are setting the new smaller base.
        // Original was: h-10, px-3, py-2, text-sm
        // file:text-sm also changed to file:text-xs
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input };
