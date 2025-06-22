import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@nanostores/react';
import { Switch } from '~/components/ui/Switch';
import { classNames } from '~/utils/classNames';
import { tabConfigurationStore } from '~/lib/stores/settings';
import { TAB_LABELS } from '~/components/@settings/core/constants';
import type { TabType } from '~/components/@settings/core/types';
import { toast } from 'react-toastify';
// import { TbLayoutGrid } from 'react-icons/tb'; // Not used directly if SectionHeader handles icon
import { useSettingsStore } from '~/lib/stores/settings';
import { SectionHeader } from '~/components/ui/SectionHeader'; // Import SectionHeader

// Define tab icons mapping
const TAB_ICONS: Record<TabType, string> = {
  profile: 'i-ph:user-circle-fill',
  settings: 'i-ph:gear-six-fill',
  notifications: 'i-ph:bell-fill',
  features: 'i-ph:star-fill',
  data: 'i-ph:database-fill',
  'cloud-providers': 'i-ph:cloud-fill',
  'local-providers': 'i-ph:desktop-fill',
  'service-status': 'i-ph:activity-fill',
  connection: 'i-ph:wifi-high-fill',
  debug: 'i-ph:bug-fill',
  'event-logs': 'i-ph:list-bullets-fill',
  update: 'i-ph:arrow-clockwise-fill',
  'task-manager': 'i-ph:chart-line-fill',
  'tab-management': 'i-ph:squares-four-fill',
};

const DEFAULT_USER_TABS: TabType[] = ['features', 'data', 'cloud-providers', 'local-providers', 'connection', 'notifications', 'event-logs'];
const OPTIONAL_USER_TABS: TabType[] = ['profile', 'settings', 'task-manager', 'service-status', 'debug', 'update'];
const ALL_USER_TABS = [...DEFAULT_USER_TABS, ...OPTIONAL_USER_TABS];
const BETA_TABS = new Set<TabType>(['task-manager', 'service-status', 'update', 'local-providers']);

const BetaLabel = () => (
  <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] rounded-full bg-purple-500/10 text-purple-500 font-medium">BETA</span> {/* Responsive text */}
);

export const TabManagement = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const tabConfiguration = useStore(tabConfigurationStore);
  const { setSelectedTab } = useSettingsStore();

  const handleTabVisibilityChange = (tabId: TabType, checked: boolean) => {
    const currentTab = tabConfiguration.userTabs.find((tab) => tab.id === tabId);
    if (!currentTab) {
      const newTab = { id: tabId, visible: checked, window: 'user' as const, order: tabConfiguration.userTabs.length };
      const updatedTabs = [...tabConfiguration.userTabs, newTab];
      tabConfigurationStore.set({ ...tabConfiguration, userTabs: updatedTabs });
      toast.success(`Tab ${checked ? 'enabled' : 'disabled'} successfully`);
      return;
    }
    const canBeEnabled = DEFAULT_USER_TABS.includes(tabId) || OPTIONAL_USER_TABS.includes(tabId);
    if (!canBeEnabled && checked) {
      toast.error('This tab cannot be enabled in user mode');
      return;
    }
    const updatedTabs = tabConfiguration.userTabs.map((tab) => (tab.id === tabId ? { ...tab, visible: checked } : tab));
    tabConfigurationStore.set({ ...tabConfiguration, userTabs: updatedTabs });
    toast.success(`Tab ${checked ? 'enabled' : 'disabled'} successfully`);
  };

  const tabConfigMap = new Map(tabConfiguration.userTabs.map((tab) => [tab.id, tab]));
  const allTabs = ALL_USER_TABS.map((tabId) => (tabConfigMap.get(tabId) || { id: tabId, visible: false, window: 'user' as const, order: -1 }));
  const filteredTabs = allTabs.filter((tab) => TAB_LABELS[tab.id].toLowerCase().includes(searchQuery.toLowerCase()));

  useEffect(() => {
    return () => { setSelectedTab('user'); };
  }, [setSelectedTab]);

  return (
    <div className="space-y-4 sm:space-y-6"> {/* Responsive space */}
      <motion.div
        className="space-y-3 sm:space-y-4" // Responsive space
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <SectionHeader
          title="Tab Management"
          description="Configure visible tabs and their order"
          icon="i-ph:squares-four-fill" // Using iconify class string
          iconContainerClassName="bg-bolt-elements-background-depth-3 text-purple-500"
          className="mt-4 mb-0 sm:mt-2" // Adjusted margins for SectionHeader
          actions={
            <div className="relative w-full sm:w-64"> {/* Responsive width for search */}
              <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none"> {/* Responsive padding */}
                <div className="i-ph:magnifying-glass w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" /> {/* Responsive icon */}
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tabs..."
                className={classNames(
                  'w-full pl-8 sm:pl-10 pr-3 py-1.5 sm:pr-4 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm', // Responsive padding, rounding, text
                  'bg-bolt-elements-background-depth-2',
                  'border border-bolt-elements-borderColor',
                  'text-bolt-elements-textPrimary',
                  'placeholder-bolt-elements-textTertiary',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
                  'transition-all duration-200',
                )}
              />
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4"> {/* Responsive gap */}
          {filteredTabs.some((tab) => DEFAULT_USER_TABS.includes(tab.id)) && (
            <SectionHeader
              title="Default Tabs"
              icon="i-ph:star-fill"
              iconContainerClassName="text-purple-500 bg-transparent"
              titleClassName="text-sm sm:text-base"
              className="col-span-full mt-2 sm:mt-4 mb-0 sm:mb-2 pt-0" // Adjusted margins & top padding
            />
          )}

          {filteredTabs
            .filter((tab) => DEFAULT_USER_TABS.includes(tab.id))
            .map((tab, index) => (
              <motion.div
                key={tab.id}
                className={classNames(
                  'rounded-md sm:rounded-lg border bg-bolt-elements-background text-bolt-elements-textPrimary', // Responsive rounding
                  'bg-bolt-elements-background-depth-2',
                  'hover:bg-bolt-elements-background-depth-3',
                  'transition-all duration-200',
                  'relative overflow-hidden group',
                )}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.01 }} // Slightly reduced hover scale
              >
                <div className="absolute top-1 right-1.5 flex gap-1">
                  <span className="px-1.5 py-0.25 text-[9px] sm:text-xs rounded-full bg-purple-500/10 text-purple-500 font-medium"> {/* Responsive tag */}
                    Default
                  </span>
                </div>

                <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4"> {/* Responsive gap & padding */}
                  <motion.div
                    className={classNames(
                      'w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl', // Responsive size & rounding
                      'bg-bolt-elements-background-depth-3 group-hover:bg-bolt-elements-background-depth-4',
                      'transition-all duration-200',
                      tab.visible ? 'text-purple-500' : 'text-bolt-elements-textSecondary',
                    )}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <div className={classNames('w-5 h-5 sm:w-6 sm:h-6', 'transition-transform duration-200', 'group-hover:rotate-12')}> {/* Responsive icon size */}
                      <div className={classNames(TAB_ICONS[tab.id], 'w-full h-full')} />
                    </div>
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 sm:gap-4"> {/* Responsive gap */}
                      <div className="flex-1"> {/* Allow text to wrap */}
                        <div className="flex items-center gap-1.5 sm:gap-2"> {/* Responsive gap */}
                          <h4 className="text-xs sm:text-sm font-medium text-bolt-elements-textPrimary group-hover:text-purple-500 transition-colors"> {/* Responsive text */}
                            {TAB_LABELS[tab.id]}
                          </h4>
                          {BETA_TABS.has(tab.id) && <BetaLabel />}
                        </div>
                        <p className="text-[10px] sm:text-xs text-bolt-elements-textSecondary mt-0.5"> {/* Responsive text */}
                          {tab.visible ? 'Visible in user mode' : 'Hidden in user mode'}
                        </p>
                      </div>
                      <Switch
                        checked={tab.visible}
                        onCheckedChange={(checked) => {
                          const isDisabled = !DEFAULT_USER_TABS.includes(tab.id) && !OPTIONAL_USER_TABS.includes(tab.id);
                          if (!isDisabled) handleTabVisibilityChange(tab.id, checked);
                        }}
                        className={classNames('data-[state=checked]:bg-purple-500 ml-2 sm:ml-4', { // Responsive margin
                          'opacity-50 pointer-events-none': !DEFAULT_USER_TABS.includes(tab.id) && !OPTIONAL_USER_TABS.includes(tab.id),
                        })}
                      />
                    </div>
                  </div>
                </div>
                <motion.div
                  className="absolute inset-0 border-2 border-purple-500/0 rounded-md sm:rounded-lg pointer-events-none" // Responsive rounding
                  animate={{
                    borderColor: tab.visible ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0)',
                    scale: tab.visible ? 1 : 0.98,
                  }}
                  transition={{ duration: 0.2 }}
                />
              </motion.div>
            ))}

          {filteredTabs.some((tab) => OPTIONAL_USER_TABS.includes(tab.id)) && (
             <SectionHeader
              title="Optional Tabs"
              icon="i-ph:plus-circle-fill"
              iconContainerClassName="text-blue-500 bg-transparent"
              titleClassName="text-sm sm:text-base"
              className="col-span-full mt-4 sm:mt-6 mb-0 sm:mb-2 pt-0" // Adjusted margins & top padding
            />
          )}

          {filteredTabs
            .filter((tab) => OPTIONAL_USER_TABS.includes(tab.id))
            .map((tab, index) => (
              <motion.div
                key={tab.id}
                className={classNames(
                  'rounded-md sm:rounded-lg border bg-bolt-elements-background text-bolt-elements-textPrimary',
                  'bg-bolt-elements-background-depth-2',
                  'hover:bg-bolt-elements-background-depth-3',
                  'transition-all duration-200',
                  'relative overflow-hidden group',
                )}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.01 }}
              >
                <div className="absolute top-1 right-1.5 flex gap-1">
                  <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-xs rounded-full bg-blue-500/10 text-blue-500 font-medium"> {/* Responsive tag */}
                    Optional
                  </span>
                </div>
                <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4">
                  <motion.div
                    className={classNames(
                      'w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl',
                      'bg-bolt-elements-background-depth-3 group-hover:bg-bolt-elements-background-depth-4',
                      'transition-all duration-200',
                      tab.visible ? 'text-purple-500' : 'text-bolt-elements-textSecondary',
                    )}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <div className={classNames('w-5 h-5 sm:w-6 sm:h-6', 'transition-transform duration-200', 'group-hover:rotate-12')}>
                      <div className={classNames(TAB_ICONS[tab.id], 'w-full h-full')} />
                    </div>
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 sm:gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <h4 className="text-xs sm:text-sm font-medium text-bolt-elements-textPrimary group-hover:text-purple-500 transition-colors">
                            {TAB_LABELS[tab.id]}
                          </h4>
                          {BETA_TABS.has(tab.id) && <BetaLabel />}
                        </div>
                        <p className="text-[10px] sm:text-xs text-bolt-elements-textSecondary mt-0.5">
                          {tab.visible ? 'Visible in user mode' : 'Hidden in user mode'}
                        </p>
                      </div>
                      <Switch
                        checked={tab.visible}
                        onCheckedChange={(checked) => {
                          const isDisabled = !DEFAULT_USER_TABS.includes(tab.id) && !OPTIONAL_USER_TABS.includes(tab.id);
                          if (!isDisabled) handleTabVisibilityChange(tab.id, checked);
                        }}
                        className={classNames('data-[state=checked]:bg-purple-500 ml-2 sm:ml-4', {
                          'opacity-50 pointer-events-none': !DEFAULT_USER_TABS.includes(tab.id) && !OPTIONAL_USER_TABS.includes(tab.id),
                        })}
                      />
                    </div>
                  </div>
                </div>
                <motion.div
                  className="absolute inset-0 border-2 border-purple-500/0 rounded-md sm:rounded-lg pointer-events-none"
                  animate={{
                    borderColor: tab.visible ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0)',
                    scale: tab.visible ? 1 : 0.98,
                  }}
                  transition={{ duration: 0.2 }}
                />
              </motion.div>
            ))}
        </div>
      </motion.div>
    </div>
  );
};
