import React from 'react';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import { Button } from '~/components/ui/Button';
import { Badge } from '~/components/ui/Badge';
import type { IconType } from 'react-icons';

interface ServiceConnectionCardProps {
  serviceName: string;
  serviceIcon: React.ReactNode | string; // Icon class or ReactNode
  isConnected: boolean;
  userInfo?: string | null;
  apiOk?: boolean | null; // null if not applicable or not checked yet
  onConnectClick?: () => void;
  onResetClick?: () => void;
  isActionDisabled?: boolean;
  isLoading?: boolean; // For showing loading state on the card
  statusUrl?: string;
  customStatusMessage?: string;
}

export const ServiceConnectionCard: React.FC<ServiceConnectionCardProps> = ({
  serviceName,
  serviceIcon,
  isConnected,
  userInfo,
  apiOk,
  onConnectClick,
  onResetClick,
  isActionDisabled,
  isLoading,
  statusUrl,
  customStatusMessage,
}) => {
  const cardContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full text-xs sm:text-sm text-bolt-elements-textSecondary">
          <div className="i-ph:spinner-gap w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-2" />
          Loading status...
        </div>
      );
    }
    return (
      <>
        <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-2">
          <span
            className={classNames(
              'text-lg sm:text-xl font-semibold',
              isConnected ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400',
            )}
          >
            {isConnected ? 'Connected' : 'Not Connected'}
          </span>
        </div>
        {isConnected && (
          <>
            {userInfo && (
              <div className="text-[10px] sm:text-xs text-bolt-elements-textSecondary mt-1.5 sm:mt-2 flex items-center gap-1 sm:gap-1.5 truncate">
                <div className="i-ph:user w-3 h-3 sm:w-3.5 sm:h-3.5 text-bolt-elements-item-contentAccent dark:text-bolt-elements-item-contentAccent flex-shrink-0" />
                <span className="truncate">User: {userInfo}</span>
              </div>
            )}
            {apiOk !== null && apiOk !== undefined && (
                 <div className="text-[10px] sm:text-xs text-bolt-elements-textSecondary mt-1.5 sm:mt-2 flex items-center gap-1 sm:gap-1.5">
                    <div className="i-ph:check-circle w-3 h-3 sm:w-3.5 sm:h-3.5 text-bolt-elements-item-contentAccent dark:text-bolt-elements-item-contentAccent" />
                    API Status:{' '}
                    <Badge
                        variant={apiOk ? 'default' : 'destructive'}
                        className="ml-1 text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5"
                    >
                        {apiOk ? 'OK' : 'Failed'}
                    </Badge>
                 </div>
            )}
            {customStatusMessage && (
                 <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-bolt-elements-textTertiary">{customStatusMessage}</p>
            )}
          </>
        )}
        {!isConnected && onConnectClick && (
          <Button
            onClick={onConnectClick}
            variant="outline"
            size="sm" // Responsive via Button component
            className="mt-auto self-start hover:bg-bolt-elements-item-backgroundActive/10 hover:text-bolt-elements-textPrimary dark:hover:bg-bolt-elements-item-backgroundActive/10 dark:hover:text-bolt-elements-textPrimary transition-colors text-xs"
            disabled={isActionDisabled}
          >
            <div className="i-ph:plug w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
            Connect Now
          </Button>
        )}
         {isConnected && onResetClick && (
          <Button
            onClick={onResetClick}
            variant="outline"
            size="sm"
            className="mt-auto self-start hover:bg-red-500/10 hover:text-red-500 dark:hover:bg-red-500/20 dark:hover:text-red-400 transition-colors text-xs border-red-500/50 text-red-500"
            disabled={isActionDisabled}
          >
            <div className="i-ph:trash w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
            Reset
          </Button>
        )}
      </>
    );
  };

  const CardWrapper = statusUrl ? 'a' : 'div';
  const cardProps = statusUrl ? { href: statusUrl, target: '_blank', rel: 'noopener noreferrer' } : {};


  return (
    <motion.div
        whileHover={{ scale: 1.02 }}
        className={classNames(
            'p-3 sm:p-4 rounded-lg sm:rounded-xl bg-bolt-elements-background dark:bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor hover:border-bolt-elements-borderColorActive/70 dark:hover:border-bolt-elements-borderColorActive/70 transition-all duration-200 min-h-[140px] sm:min-h-[160px] md:min-h-[180px] flex flex-col', // Responsive min-height
        )}
    >
      <CardWrapper {...cardProps} className={classNames("flex flex-col flex-1", statusUrl ? "cursor-pointer group/card" : "")}>
        <div className="flex items-center gap-1.5 sm:gap-2"> {/* Responsive gap */}
          {typeof serviceIcon === 'string' ? (
            <div className={classNames(serviceIcon, 'w-4 h-4 text-bolt-elements-item-contentAccent dark:text-bolt-elements-item-contentAccent')} />
          ) : (
            serviceIcon
          )}
          <div className="text-xs sm:text-sm font-medium text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary group-hover/card:text-purple-500 transition-colors"> {/* Responsive text */}
            {serviceName}
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-between mt-1">
          {cardContent()}
        </div>
      </CardWrapper>
    </motion.div>
  );
};
