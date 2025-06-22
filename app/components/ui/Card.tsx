import { forwardRef } from 'react';
import { classNames } from '~/utils/classNames';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={classNames(
        'rounded-md sm:rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary shadow-sm', // Responsive rounding
        className,
      )}
      {...props}
    />
  );
});
Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => {
  return <div ref={ref} className={classNames('flex flex-col space-y-1 sm:space-y-1.5 p-3 sm:p-4 md:p-6', className)} {...props} />; // Responsive space and padding
});
CardHeader.displayName = 'CardHeader';

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  icon?: React.ReactNode | string;
  iconClassName?: string;
}

const CardTitle = forwardRef<HTMLParagraphElement, CardTitleProps>(
  ({ className, icon, iconClassName, children, ...props }, ref) => {
    return (
      <div className={classNames('flex items-center gap-1.5 sm:gap-2', className)}> {/* Base gap-1.5 is fine */}
        {icon && (
          typeof icon === 'string' ? (
            <div className={classNames(icon, 'w-4 h-4 sm:w-5 sm:h-5', iconClassName)} /> // Base w-4 h-4 is fine
          ) : (
            icon
          )
        )}
        <h3
          ref={ref}
          className={classNames('text-base sm:text-xl md:text-2xl font-semibold leading-none tracking-tight', className)} // Base text-base
          {...props}
        >
          {children}
        </h3>
      </div>
    );
  },
);
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return <p ref={ref} className={classNames('text-xs sm:text-sm text-bolt-elements-textSecondary', className)} {...props} />; // Base text-xs is fine
  },
);
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => {
  return <div ref={ref} className={classNames('p-2 pt-0 sm:p-4 sm:pt-0 md:p-6 md:pt-0', className)} {...props} />; // Base p-2
});
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={classNames('flex items-center p-2 pt-0 sm:p-4 sm:pt-0 md:p-6 md:pt-0', className)} {...props} /> // Base p-2
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
