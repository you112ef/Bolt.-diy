import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';
import { Switch } from '~/components/ui/Switch';
import type { UserProfile } from '~/components/@settings/core/types';
import { isMac } from '~/utils/os';

// Helper to get modifier key symbols/text
const getModifierSymbol = (modifier: string): string => {
  switch (modifier) {
    case 'meta':
      return isMac ? '⌘' : 'Win';
    case 'alt':
      return isMac ? '⌥' : 'Alt';
    case 'shift':
      return '⇧';
    default:
      return modifier;
  }
};

export default function SettingsTab() {
  const [currentTimezone, setCurrentTimezone] = useState('');
  const [settings, setSettings] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('bolt_user_profile');
    return saved
      ? JSON.parse(saved)
      : {
          notifications: true,
          language: 'en',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
  });

  useEffect(() => {
    setCurrentTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  // Save settings automatically when they change
  useEffect(() => {
    try {
      // Get existing profile data
      const existingProfile = JSON.parse(localStorage.getItem('bolt_user_profile') || '{}');

      // Merge with new settings
      const updatedProfile = {
        ...existingProfile,
        notifications: settings.notifications,
        language: settings.language,
        timezone: settings.timezone,
      };

      localStorage.setItem('bolt_user_profile', JSON.stringify(updatedProfile));
      toast.success('Settings updated');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to update settings');
    }
  }, [settings]);

  return (
    <div className="space-y-3 sm:space-y-4"> {/* Base space-y-3 is fine */}
      {/* Language & Notifications */}
      <motion.div
        className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-sm dark:shadow-none p-2 space-y-2 sm:p-4 sm:space-y-4" // Base: p-2, space-y-2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Base: gap-1, mb-2. Icon w-3.5 h-3.5. Text text-xs */}
        <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3 md:mb-4">
          <div className="i-ph:palette-fill w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />
          <span className="text-xs sm:text-sm font-medium text-bolt-elements-textPrimary">Preferences</span>
        </div>

        <div>
          {/* Base: gap-1, mb-1. Icon w-3.5 h-3.5. Label text-xs */}
          <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
            <div className="i-ph:translate-fill w-3.5 h-3.5 sm:w-4 sm:h-4 text-bolt-elements-textSecondary" />
            <label className="block text-xs sm:text-sm text-bolt-elements-textSecondary">Language</label>
          </div>
          {/* Base select: px-2.5 py-1.5 rounded-md text-xs */}
          <select
            value={settings.language}
            onChange={(e) => setSettings((prev) => ({ ...prev, language: e.target.value }))}
            className={classNames(
              'w-full px-2.5 py-1.5 rounded-md text-xs sm:px-3 sm:py-2 sm:rounded-lg sm:text-sm',
              'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
              'border border-[#E5E5E5] dark:border-[#1A1A1A]',
              'text-bolt-elements-textPrimary',
              'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
              'transition-all duration-200',
            )}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="it">Italiano</option>
            <option value="pt">Português</option>
            <option value="ru">Русский</option>
            <option value="zh">中文</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
          </select>
        </div>

        <div>
          {/* Responsive label group */}
          <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
            <div className="i-ph:bell-fill w-3.5 h-3.5 sm:w-4 sm:h-4 text-bolt-elements-textSecondary" />
            <label className="block text-xs sm:text-sm text-bolt-elements-textSecondary">Notifications</label>
          </div>
          <div className="flex items-center justify-between">
            {/* Responsive text */}
            <span className="text-xs sm:text-sm text-bolt-elements-textSecondary">
              {settings.notifications ? 'Notifications are enabled' : 'Notifications are disabled'}
            </span>
            <Switch
              checked={settings.notifications}
              onCheckedChange={(checked) => {
                // Update local state
                setSettings((prev) => ({ ...prev, notifications: checked }));

                // Update localStorage immediately
                const existingProfile = JSON.parse(localStorage.getItem('bolt_user_profile') || '{}');
                const updatedProfile = {
                  ...existingProfile,
                  notifications: checked,
                };
                localStorage.setItem('bolt_user_profile', JSON.stringify(updatedProfile));

                // Dispatch storage event for other components
                window.dispatchEvent(
                  new StorageEvent('storage', {
                    key: 'bolt_user_profile',
                    newValue: JSON.stringify(updatedProfile),
                  }),
                );

                toast.success(`Notifications ${checked ? 'enabled' : 'disabled'}`);
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* Timezone */}
      <motion.div
        className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-sm dark:shadow-none p-2 sm:p-4" // Base p-2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Base: gap-1 mb-2. Icon w-3.5 h-3.5. Text text-xs */}
        <div className="flex items-center gap-1 mb-2 sm:gap-2 sm:mb-4">
          <div className="i-ph:clock-fill w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />
          <span className="text-xs sm:text-sm font-medium text-bolt-elements-textPrimary">Time Settings</span>
        </div>

        <div>
          {/* Base: gap-1 mb-1. Icon w-3.5 h-3.5. Label text-xs */}
          <div className="flex items-center gap-1 mb-1 sm:gap-2 sm:mb-2">
            <div className="i-ph:globe-fill w-3.5 h-3.5 sm:w-4 sm:h-4 text-bolt-elements-textSecondary" />
            <label className="block text-xs sm:text-sm text-bolt-elements-textSecondary">Timezone</label>
          </div>
          {/* Base select: px-2 py-1.5 rounded-md text-xs */}
          <select
            value={settings.timezone}
            onChange={(e) => setSettings((prev) => ({ ...prev, timezone: e.target.value }))}
            className={classNames(
              'w-full px-2 py-1.5 rounded-md text-xs sm:px-3 sm:py-2 sm:rounded-lg sm:text-sm',
              'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
              'border border-[#E5E5E5] dark:border-[#1A1A1A]',
              'text-bolt-elements-textPrimary',
              'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
              'transition-all duration-200',
            )}
          >
            <option value={currentTimezone}>{currentTimezone}</option>
          </select>
        </div>
      </motion.div>

      {/* Simplified Keyboard Shortcuts */}
      <motion.div
        className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-sm dark:shadow-none p-2 sm:p-4" // Base p-2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {/* Base: gap-1 mb-2. Icon w-3.5 h-3.5. Text text-xs */}
        <div className="flex items-center gap-1 mb-2 sm:gap-2 sm:mb-4">
          <div className="i-ph:keyboard-fill w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />
          <span className="text-xs sm:text-sm font-medium text-bolt-elements-textPrimary">Keyboard Shortcuts</span>
        </div>

        <div className="space-y-1.5 sm:space-y-2"> {/* Base space-y-1.5 is fine */}
          {/* Base p-1.5 rounded-md */}
          <div className="flex flex-col items-start sm:flex-row sm:items-center sm:justify-between p-1.5 sm:p-2 rounded-md sm:rounded-lg bg-[#FAFAFA] dark:bg-[#1A1A1A]">
            <div className="flex flex-col mb-1 sm:mb-0">
              <span className="text-xs sm:text-sm text-bolt-elements-textPrimary">Toggle Theme</span>
              <span className="text-[10px] sm:text-xs text-bolt-elements-textSecondary">Switch between light and dark mode</span>
            </div>
            {/* Base gap-0.5 */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              {/* Base kbd: px-1.5 py-0.5 text-[10px] rounded */}
              <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-bolt-elements-textSecondary bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A] rounded sm:px-2 sm:py-1 sm:text-xs sm:rounded-md shadow-sm">
                {getModifierSymbol('meta')}
              </kbd>
              <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-bolt-elements-textSecondary bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A] rounded sm:px-2 sm:py-1 sm:text-xs sm:rounded-md shadow-sm">
                {getModifierSymbol('alt')}
              </kbd>
              <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-bolt-elements-textSecondary bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A] rounded sm:px-2 sm:py-1 sm:text-xs sm:rounded-md shadow-sm">
                {getModifierSymbol('shift')}
              </kbd>
              <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-bolt-elements-textSecondary bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A] rounded sm:px-2 sm:py-1 sm:text-xs sm:rounded-md shadow-sm">
                D
              </kbd>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
