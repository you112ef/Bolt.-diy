import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { logStore } from '~/lib/stores/logs';
import { useStore } from '@nanostores/react';
import { formatDistanceToNow } from 'date-fns';
import { classNames } from '~/utils/classNames';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface NotificationDetails {
  type?: string;
  message?: string;
  currentVersion?: string;
  latestVersion?: string;
  branch?: string;
  updateUrl?: string;
}

type FilterType = 'all' | 'system' | 'error' | 'warning' | 'update' | 'info' | 'provider' | 'network';

const NotificationsTab = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const logs = useStore(logStore.logs);

  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      logStore.logPerformanceMetric('NotificationsTab', 'mount-duration', duration);
    };
  }, []);

  const handleClearNotifications = () => {
    const count = Object.keys(logs).length;
    logStore.logInfo('Cleared notifications', {
      type: 'notification_clear',
      message: `Cleared ${count} notifications`,
      clearedCount: count,
      component: 'notifications',
    });
    logStore.clearLogs();
  };

  const handleUpdateAction = (updateUrl: string) => {
    logStore.logInfo('Update link clicked', {
      type: 'update_click',
      message: 'User clicked update link',
      updateUrl,
      component: 'notifications',
    });
    window.open(updateUrl, '_blank');
  };

  const handleFilterChange = (newFilter: FilterType) => {
    logStore.logInfo('Notification filter changed', {
      type: 'filter_change',
      message: `Filter changed to ${newFilter}`,
      previousFilter: filter,
      newFilter,
      component: 'notifications',
    });
    setFilter(newFilter);
  };

  const filteredLogs = Object.values(logs)
    .filter((log) => {
      if (filter === 'all') {
        return true;
      }

      if (filter === 'update') {
        return log.details?.type === 'update';
      }

      if (filter === 'system') {
        return log.category === 'system';
      }

      if (filter === 'provider') {
        return log.category === 'provider';
      }

      if (filter === 'network') {
        return log.category === 'network';
      }

      return log.level === filter;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getNotificationStyle = (level: string, type?: string) => {
    if (type === 'update') {
      return {
        icon: 'i-ph:arrow-circle-up',
        color: 'text-purple-500 dark:text-purple-400',
        bg: 'hover:bg-purple-500/10 dark:hover:bg-purple-500/20',
      };
    }

    switch (level) {
      case 'error':
        return {
          icon: 'i-ph:warning-circle',
          color: 'text-red-500 dark:text-red-400',
          bg: 'hover:bg-red-500/10 dark:hover:bg-red-500/20',
        };
      case 'warning':
        return {
          icon: 'i-ph:warning',
          color: 'text-yellow-500 dark:text-yellow-400',
          bg: 'hover:bg-yellow-500/10 dark:hover:bg-yellow-500/20',
        };
      case 'info':
        return {
          icon: 'i-ph:info',
          color: 'text-blue-500 dark:text-blue-400',
          bg: 'hover:bg-blue-500/10 dark:hover:bg-blue-500/20',
        };
      default:
        return {
          icon: 'i-ph:bell',
          color: 'text-gray-500 dark:text-gray-400',
          bg: 'hover:bg-gray-500/10 dark:hover:bg-gray-500/20',
        };
    }
  };

  const renderNotificationDetails = (details: NotificationDetails) => {
    if (details.type === 'update') {
      return (
        // Responsive gap for details container
        <div className="flex flex-col gap-1 sm:gap-2">
          {/* Responsive text for message */}
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{details.message}</p>
          {/* Responsive text and gap for version info */}
          <div className="flex flex-col gap-0.5 sm:gap-1 text-[10px] sm:text-xs text-gray-500 dark:text-gray-500">
            <p>Current Version: {details.currentVersion}</p>
            <p>Latest Version: {details.latestVersion}</p>
            <p>Branch: {details.branch}</p>
          </div>
          {/* Responsive button styling */}
          <button
            onClick={() => details.updateUrl && handleUpdateAction(details.updateUrl)}
            className={classNames(
              'mt-1.5 sm:mt-2 inline-flex items-center self-start gap-1 sm:gap-2', // self-start to prevent stretching if parent is items-stretch
              'rounded-md sm:rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5',
              'text-xs sm:text-sm font-medium',
              'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
              'border border-[#E5E5E5] dark:border-[#1A1A1A]',
              'text-gray-900 dark:text-white',
              'hover:bg-purple-500/10 dark:hover:bg-purple-500/20',
              'transition-all duration-200',
            )}
          >
            <span className="i-ph:git-branch text-base sm:text-lg" /> {/* Responsive icon size */}
            View Changes
          </button>
        </div>
      );
    }

    return details.message ? <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{details.message}</p> : null; // Responsive text
  };

  const filterOptions: { id: FilterType; label: string; icon: string; color: string }[] = [
    { id: 'all', label: 'All Notifications', icon: 'i-ph:bell', color: '#9333ea' },
    { id: 'system', label: 'System', icon: 'i-ph:gear', color: '#6b7280' },
    { id: 'update', label: 'Updates', icon: 'i-ph:arrow-circle-up', color: '#9333ea' },
    { id: 'error', label: 'Errors', icon: 'i-ph:warning-circle', color: '#ef4444' },
    { id: 'warning', label: 'Warnings', icon: 'i-ph:warning', color: '#f59e0b' },
    { id: 'info', label: 'Information', icon: 'i-ph:info', color: '#3b82f6' },
    { id: 'provider', label: 'Providers', icon: 'i-ph:robot', color: '#10b981' },
    { id: 'network', label: 'Network', icon: 'i-ph:wifi-high', color: '#6366f1' },
  ];

  return (
    <div className="flex h-full flex-col gap-3 sm:gap-4 md:gap-6"> {/* Responsive gap */}
      {/* Responsive flex direction and gap for top controls */}
      <div className="flex flex-col gap-2 items-stretch sm:flex-row sm:items-center sm:justify-between">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            {/* Responsive button styling */}
            <button
              className={classNames(
                'flex items-center justify-center sm:justify-start gap-1 sm:gap-2', // Center content on mobile when stacked
                'rounded-md sm:rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5',
                'text-xs sm:text-sm text-gray-900 dark:text-white',
                'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
                'border border-[#E5E5E5] dark:border-[#1A1A1A]',
                'hover:bg-purple-500/10 dark:hover:bg-purple-500/20',
                'transition-all duration-200',
              )}
            >
              <span
                className={classNames('text-base sm:text-lg', filterOptions.find((opt) => opt.id === filter)?.icon || 'i-ph:funnel')} // Responsive icon size
                style={{ color: filterOptions.find((opt) => opt.id === filter)?.color }}
              />
              {filterOptions.find((opt) => opt.id === filter)?.label || 'Filter Notifications'}
              <span className="i-ph:caret-down text-base sm:text-lg text-gray-500 dark:text-gray-400" /> {/* Responsive icon size */}
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[200px] bg-white dark:bg-[#0A0A0A] rounded-lg shadow-lg py-1 z-[250] animate-in fade-in-0 zoom-in-95 border border-[#E5E5E5] dark:border-[#1A1A1A]"
              sideOffset={5}
              align="start" // Keep align start for consistency
              side="bottom"
            >
              {filterOptions.map((option) => (
                // Responsive item styling
                <DropdownMenu.Item
                  key={option.id}
                  className="group flex items-center px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-500/10 dark:hover:bg-purple-500/20 cursor-pointer transition-colors"
                  onClick={() => handleFilterChange(option.id)}
                >
                  {/* Responsive icon margin and container */}
                  <div className="mr-2 sm:mr-3 flex h-4 sm:h-5 w-4 sm:w-5 items-center justify-center">
                    <div
                      className={classNames(option.icon, 'text-base sm:text-lg group-hover:text-purple-500 transition-colors')} // Responsive icon size
                      style={{ color: option.color }}
                    />
                  </div>
                  <span className="group-hover:text-purple-500 transition-colors">{option.label}</span>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* Responsive button styling */}
        <button
          onClick={handleClearNotifications}
          className={classNames(
            'group flex items-center justify-center sm:justify-start gap-1 sm:gap-2', // Center content on mobile
            'rounded-md sm:rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5',
            'text-xs sm:text-sm text-gray-900 dark:text-white',
            'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
            'border border-[#E5E5E5] dark:border-[#1A1A1A]',
            'hover:bg-purple-500/10 dark:hover:bg-purple-500/20',
            'transition-all duration-200',
          )}
        >
          <span className="i-ph:trash text-base sm:text-lg text-gray-500 dark:text-gray-400 group-hover:text-purple-500 transition-colors" /> {/* Responsive icon size */}
          Clear All
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:gap-3 md:gap-4"> {/* Responsive gap */}
        {filteredLogs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={classNames(
              'flex flex-col items-center justify-center gap-2 sm:gap-4', // Responsive gap
              'rounded-md sm:rounded-lg p-4 sm:p-6 md:p-8 text-center', // Responsive padding and rounding
              'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
              'border border-[#E5E5E5] dark:border-[#1A1A1A]',
            )}
          >
            <span className="i-ph:bell-slash text-3xl sm:text-4xl text-gray-400 dark:text-gray-600" /> {/* Responsive icon size */}
            <div className="flex flex-col gap-0.5 sm:gap-1"> {/* Responsive gap */}
              <h3 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">No Notifications</h3> {/* Responsive text */}
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">You're all caught up!</p> {/* Responsive text */}
            </div>
          </motion.div>
        ) : (
          filteredLogs.map((log) => {
            const style = getNotificationStyle(log.level, log.details?.type);
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={classNames(
                  'flex flex-col gap-1.5 sm:gap-2', // Responsive gap
                  'rounded-md sm:rounded-lg p-3 sm:p-4', // Responsive padding and rounding
                  'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
                  'border border-[#E5E5E5] dark:border-[#1A1A1A]',
                  style.bg,
                  'transition-all duration-200',
                )}
              >
                {/* Responsive gap for notification item header */}
                <div className="flex items-start justify-between gap-2 sm:gap-3 md:gap-4">
                  {/* Responsive gap for icon and text content */}
                  <div className="flex items-start gap-2 sm:gap-3">
                    <span className={classNames('text-base sm:text-lg', style.icon, style.color)} /> {/* Responsive icon size */}
                    <div className="flex flex-col gap-0.5 sm:gap-1"> {/* Responsive gap */}
                      <h3 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{log.message}</h3> {/* Responsive text */}
                      {log.details && renderNotificationDetails(log.details as NotificationDetails)}
                      {/* Responsive category text */}
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        Category: {log.category}
                        {log.subCategory ? ` > ${log.subCategory}` : ''}
                      </p>
                    </div>
                  </div>
                  {/* Responsive time text */}
                  <time className="shrink-0 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                  </time>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationsTab;
