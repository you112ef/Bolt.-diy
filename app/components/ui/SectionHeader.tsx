import React from 'react';
import { classNames } from '~/utils/classNames';

interface SectionHeaderProps {
  icon?: React.ReactNode | string;
  title: string;
  description?: string;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  iconContainerClassName?: string;
  iconClassName?: string;
  actions?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  title,
  description,
  className,
  titleClassName,
  descriptionClassName,
  iconContainerClassName,
  iconClassName,
  actions,
}) => {
  return (
    <div
      className={classNames(
        'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between', // Stacks on small, row on sm+
        'mb-3 sm:mb-4 md:mb-6', // Responsive bottom margin
        className,
      )}
    >
      <div className="flex items-center gap-2 sm:gap-3"> {/* Responsive gap for icon and text */}
        {icon && (
          <div
            className={classNames(
              'w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md sm:rounded-lg', // Responsive size & rounding
              'bg-bolt-elements-background-depth-3 text-purple-500', // Default icon container styling
              iconContainerClassName,
            )}
          >
            {typeof icon === 'string' ? (
              <div className={classNames(icon, 'w-4 h-4 sm:w-5 sm:h-5', iconClassName)} /> // Responsive icon from class
            ) : (
              icon // Custom icon node
            )}
          </div>
        )}
        <div>
          <h2
            className={classNames(
              'text-base sm:text-lg font-semibold text-bolt-elements-textPrimary', // Responsive title text
              titleClassName,
            )}
          >
            {title}
          </h2>
          {description && (
            <p
              className={classNames(
                'text-xs sm:text-sm text-bolt-elements-textSecondary mt-0.5', // Responsive description text & margin
                descriptionClassName,
              )}
            >
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="mt-2 sm:mt-0 self-start sm:self-center">{actions}</div>} {/* Actions align bottom on mobile stack, center on row */}
    </div>
  );
};
