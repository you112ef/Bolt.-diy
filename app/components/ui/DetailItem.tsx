import React from 'react';
import { classNames } from '~/utils/classNames';

interface DetailItemProps {
  label: string;
  value: React.ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  icon?: React.ReactNode | string;
  iconClassName?: string;
  layout?: 'horizontal' | 'vertical'; // Default 'horizontal', stacks on small screens anyway
}

export const DetailItem: React.FC<DetailItemProps> = ({
  label,
  value,
  className,
  labelClassName,
  valueClassName,
  icon,
  iconClassName,
  layout = 'horizontal', // This prop might mostly influence behavior above 'sm' if needed
}) => {
  return (
    <div
      className={classNames(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between', // Stacks on base, row on sm+
        'py-1.5 sm:py-2', // Responsive padding
        className,
      )}
    >
      <div className={classNames('flex items-center gap-1.5 sm:gap-2', labelClassName)}>
        {icon && (
          typeof icon === 'string' ? (
            <div className={classNames(icon, 'w-3.5 h-3.5 sm:w-4 sm:h-4', iconClassName)} />
          ) : (
            icon
          )
        )}
        <span className="text-xs sm:text-sm text-bolt-elements-textSecondary">{label}:</span>
      </div>
      <div
        className={classNames(
          'text-xs sm:text-sm text-bolt-elements-textPrimary sm:text-right break-words', // Responsive text, right align on sm+
          'mt-0.5 sm:mt-0 ml-0 sm:ml-2', // Margin for spacing
          valueClassName,
        )}
      >
        {value}
      </div>
    </div>
  );
};
