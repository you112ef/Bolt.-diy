import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';
import { logStore, type LogEntry } from '~/lib/stores/logs';
import { useStore } from '@nanostores/react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/Collapsible';
import { Progress } from '~/components/ui/Progress';
import { ScrollArea } from '~/components/ui/ScrollArea';
import { Badge } from '~/components/ui/Badge';
import { jsPDF } from 'jspdf';
import { useSettings } from '~/lib/hooks/useSettings';
import { useAsyncDataFetcher } from '~/lib/hooks/useAsyncDataFetcher';
import { SectionHeader } from '~/components/ui/SectionHeader';
import { DetailItem } from '~/components/ui/DetailItem';
import { Button } from '~/components/ui/Button';
import { ExportButtonDialog, type ExportFormatOption } from '~/components/ui/ExportButtonDialog';
import { exportAsJson, exportAsText, downloadFile as genericDownloadFile } from '~/utils/export';

interface SystemInfo {
  os: string;
  arch: string;
  platform: string;
  cpus: string;
  memory: {
    total: string;
    free: string;
    used: string;
    percentage: number;
  };
  node: string;
  browser: {
    name: string;
    version: string;
    language: string;
    userAgent: string;
    cookiesEnabled: boolean;
    online: boolean;
    platform: string;
    cores: number;
  };
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    pixelRatio: number;
  };
  time: {
    timezone: string;
    offset: number;
    locale: string;
  };
  performance: {
    memory: {
      jsHeapSizeLimit: number;
      totalJSHeapSize: number;
      usedJSHeapSize: number;
      usagePercentage: number;
    };
    timing: {
      loadTime: number;
      domReadyTime: number;
      readyStart: number;
      redirectTime: number;
      appcacheTime: number;
      unloadEventTime: number;
      lookupDomainTime: number;
      connectTime: number;
      requestTime: number;
      initDomTreeTime: number;
      loadEventTime: number;
    };
    navigation: {
      type: number;
      redirectCount: number;
    };
  };
  network: {
    downlink: number;
    effectiveType: string;
    rtt: number;
    saveData: boolean;
    type: string;
  };
  battery?: {
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
    level: number;
  };
  storage: {
    quota: number;
    usage: number;
    persistent: boolean;
    temporary: boolean;
  };
}

interface GitHubRepoInfo {
  fullName: string;
  defaultBranch: string;
  stars: number;
  forks: number;
  openIssues?: number;
}

interface GitInfo {
  local: {
    commitHash: string;
    branch: string;
    commitTime: string;
    author: string;
    email: string;
    remoteUrl: string;
    repoName: string;
  };
  github?: {
    currentRepo: GitHubRepoInfo;
    upstream?: GitHubRepoInfo;
  };
  isForked?: boolean;
}

interface WebAppInfo {
  name: string;
  version: string;
  description: string;
  license: string;
  environment: string;
  timestamp: string;
  runtimeInfo: {
    nodeVersion: string;
  };
  dependencies: {
    production: Array<{ name: string; version: string; type: string }>;
    development: Array<{ name: string; version: string; type: string }>;
    peer: Array<{ name: string; version: string; type: string }>;
    optional: Array<{ name: string; version: string; type: string }>;
  };
  gitInfo: GitInfo;
}

interface OllamaServiceStatus {
  isRunning: boolean;
  lastChecked: Date;
  error?: string;
  models?: Array<{
    name: string;
    size: string; // Assuming size is a string like "7B" or "13B"
    quantization: string; // Assuming quantization is a string like "Q4_0"
  }>;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  if (i === 0) return `${bytes} ${units[i]}`;
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
};

// const formatTime = (seconds: number): string => { // Not used in this file
//   if (!isFinite(seconds) || seconds === 0) return 'Unknown';
//   const hours = Math.floor(seconds / 3600);
//   const minutes = Math.floor((seconds % 3600) / 60);
//   if (hours > 0) return `${hours}h ${minutes}m`;
//   return `${minutes}m`;
// };


const DependencySection = ({
  title,
  deps,
}: {
  title: string;
  deps: Array<{ name: string; version: string; type: string }>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  if (deps.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className={classNames(
          'flex w-full items-center justify-between p-3 sm:p-4',
          'bg-white dark:bg-[#0A0A0A]',
          'hover:bg-purple-50/50 dark:hover:bg-[#1a1a1a]',
          'border-b border-[#E5E5E5] dark:border-[#1A1A1A]',
          'transition-colors duration-200',
          'first:rounded-t-lg last:rounded-b-lg',
          { 'hover:rounded-lg': !isOpen },
        )}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="i-ph:package text-bolt-elements-textSecondary w-4 h-4" />
          <span className="text-sm sm:text-base text-bolt-elements-textPrimary">
            {title} Dependencies ({deps.length})
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-xs sm:text-sm text-bolt-elements-textSecondary">{isOpen ? 'Hide' : 'Show'}</span>
          <div
            className={classNames(
              'i-ph:caret-down w-4 h-4 transform transition-transform duration-200 text-bolt-elements-textSecondary',
              isOpen ? 'rotate-180' : '',
            )}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ScrollArea
          className={classNames(
            'h-[150px] sm:h-[200px] w-full',
            'bg-white dark:bg-[#0A0A0A]',
            'border-b border-[#E5E5E5] dark:border-[#1A1A1A]',
            'last:rounded-b-lg last:border-b-0',
          )}
        >
          <div className="space-y-1.5 sm:space-y-2 p-3 sm:p-4">
            {deps.map((dep) => (
              <div key={dep.name} className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-bolt-elements-textPrimary">{dep.name}</span>
                <span className="text-bolt-elements-textSecondary">{dep.version}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  );
};

const fetchSystemInformation = async (): Promise<SystemInfo> => {
  const userAgent = navigator.userAgent;
  let detectedOS = 'Unknown';
  let detectedArch = 'unknown';

  if (userAgent.indexOf('Win') !== -1) detectedOS = 'Windows';
  else if (userAgent.indexOf('Mac') !== -1) detectedOS = 'macOS';
  else if (userAgent.indexOf('Linux') !== -1) detectedOS = 'Linux';
  else if (userAgent.indexOf('Android') !== -1) detectedOS = 'Android';
  else if (/iPhone|iPad|iPod/.test(userAgent)) detectedOS = 'iOS';

  if (userAgent.indexOf('x86_64') !== -1 || userAgent.indexOf('x64') !== -1 || userAgent.indexOf('WOW64') !== -1) detectedArch = 'x64';
  else if (userAgent.indexOf('x86') !== -1 || userAgent.indexOf('i686') !== -1) detectedArch = 'x86';
  else if (userAgent.indexOf('arm64') !== -1 || userAgent.indexOf('aarch64') !== -1) detectedArch = 'arm64';
  else if (userAgent.indexOf('arm') !== -1) detectedArch = 'arm';

  const browserName = (() => {
    if (userAgent.indexOf('Edge') !== -1 || userAgent.indexOf('Edg/') !== -1) return 'Edge';
    if (userAgent.indexOf('Chrome') !== -1) return 'Chrome';
    if (userAgent.indexOf('Firefox') !== -1) return 'Firefox';
    if (userAgent.indexOf('Safari') !== -1) return 'Safari';
    return 'Unknown';
  })();
  const browserVersionMatch = userAgent.match(/(Edge|Edg|Chrome|Firefox|Safari)[\s/](\d+(\.\d+)*)/);
  const browserVersion = browserVersionMatch ? browserVersionMatch[2] : 'Unknown';

  const memory = (performance as any).memory || {};
  const timing = performance.timing;
  const navigation = performance.navigation;
  const connection = (navigator as any).connection || {};

  let loadTime = 0;
  let domReadyTime = 0;
  try {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const navTiming = navEntries[0] as PerformanceNavigationTiming;
      loadTime = navTiming.loadEventEnd - navTiming.startTime;
      domReadyTime = navTiming.domContentLoadedEventEnd - navTiming.startTime;
    } else {
      loadTime = timing.loadEventEnd - timing.navigationStart;
      domReadyTime = timing.domContentLoadedEventEnd - timing.navigationStart;
    }
  } catch {
    loadTime = timing.loadEventEnd - timing.navigationStart;
    domReadyTime = timing.domContentLoadedEventEnd - timing.navigationStart;
  }

  let batteryInfo;
  try {
    const battery = await (navigator as any).getBattery();
    batteryInfo = {
      charging: battery.charging, chargingTime: battery.chargingTime,
      dischargingTime: battery.dischargingTime, level: battery.level * 100,
    };
  } catch { /* Battery API not supported or permission denied */ }

  let storageInfo = { quota: 0, usage: 0, persistent: false, temporary: false };
  try {
    const storage = await navigator.storage.estimate();
    const persistent = await navigator.storage.persist();
    storageInfo = { quota: storage.quota || 0, usage: storage.usage || 0, persistent, temporary: !persistent };
  } catch { /* Storage API not supported or permission denied */ }

  const performanceMemory = (performance as any).memory || {};
  const totalMemory = performanceMemory.jsHeapSizeLimit || 0;
  const usedMemory = performanceMemory.usedJSHeapSize || 0;
  const freeMemory = totalMemory - usedMemory;
  const memoryPercentage = totalMemory ? (usedMemory / totalMemory) * 100 : 0;

  return {
    os: detectedOS, arch: detectedArch, platform: navigator.platform || 'unknown',
    cpus: navigator.hardwareConcurrency + ' cores',
    memory: {
        total: formatBytes(totalMemory), free: formatBytes(freeMemory),
        used: formatBytes(usedMemory), percentage: Math.round(memoryPercentage),
    },
    node: 'browser', // This indicates client-side information
    browser: {
        name: browserName, version: browserVersion, language: navigator.language,
        userAgent: navigator.userAgent, cookiesEnabled: navigator.cookieEnabled,
        online: navigator.onLine, platform: navigator.platform || 'unknown',
        cores: navigator.hardwareConcurrency,
    },
    screen: {
        width: window.screen.width, height: window.screen.height,
        colorDepth: window.screen.colorDepth, pixelRatio: window.devicePixelRatio,
    },
    time: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        offset: new Date().getTimezoneOffset(), locale: navigator.language,
    },
    performance: {
        memory: {
            jsHeapSizeLimit: memory.jsHeapSizeLimit || 0, totalJSHeapSize: memory.totalJSHeapSize || 0,
            usedJSHeapSize: memory.usedJSHeapSize || 0,
            usagePercentage: memory.totalJSHeapSize ? (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100 : 0,
        },
        timing: {
            loadTime, domReadyTime, readyStart: timing.fetchStart - timing.navigationStart,
            redirectTime: timing.redirectEnd - timing.redirectStart, appcacheTime: timing.domainLookupStart - timing.fetchStart,
            unloadEventTime: timing.unloadEventEnd - timing.unloadEventStart, lookupDomainTime: timing.domainLookupEnd - timing.domainLookupStart,
            connectTime: timing.connectEnd - timing.connectStart, requestTime: timing.responseEnd - timing.requestStart,
            initDomTreeTime: timing.domInteractive - timing.responseEnd, loadEventTime: timing.loadEventEnd - timing.loadEventStart,
        },
        navigation: { type: navigation.type, redirectCount: navigation.redirectCount },
    },
    network: {
        downlink: connection?.downlink || 0, effectiveType: connection?.effectiveType || 'unknown',
        rtt: connection?.rtt || 0, saveData: connection?.saveData || false, type: connection?.type || 'unknown',
    },
    battery: batteryInfo, storage: storageInfo,
  };
};

const fetchWebAppInformation = async (): Promise<WebAppInfo | null> => {
  const [appResponse, gitResponse] = await Promise.all([
    fetch('/api/system/app-info'),
    fetch('/api/system/git-info'),
  ]);

  if (!appResponse.ok || !gitResponse.ok) {
    let appData = null;
    let gitData = null;
    if (appResponse.ok) appData = (await appResponse.json()) as Omit<WebAppInfo, 'gitInfo'>;
    if (gitResponse.ok) gitData = (await gitResponse.json()) as GitInfo;

    if (appData && gitData) return { ...appData, gitInfo: gitData };
    if (appData) return { ...appData, gitInfo: {} as GitInfo }; // Fallback for gitInfo if it fails
    throw new Error('Failed to fetch critical webapp info (app-info part)');
  }

  const appData = (await appResponse.json()) as Omit<WebAppInfo, 'gitInfo'>;
  const gitData = (await gitResponse.json()) as GitInfo;

  return { ...appData, gitInfo: gitData };
};


export default function DebugTab() {
  const {
    data: systemInfo,
    isLoading: isLoadingSystemInfo,
    fetchData: triggerGetSystemInfo,
  } = useAsyncDataFetcher<SystemInfo>({
    fetchFn: fetchSystemInformation,
    successMessage: 'System information updated',
    errorMessagePrefix: 'Failed to get system information',
    autoFetch: true,
  });

  const {
    data: webAppInfo,
    isLoading: isLoadingWebAppInfo,
    fetchData: triggerGetWebAppInfo,
    setData: setWebAppInfo, // Allow manual update for git info
  } = useAsyncDataFetcher<WebAppInfo | null>({
    fetchFn: fetchWebAppInformation,
    initialData: null,
    successMessage: 'WebApp information updated',
    errorMessagePrefix: 'Failed to fetch webapp information',
    autoFetch: true, // Fetch initially
  });

  const [ollamaStatus, setOllamaStatus] = useState<OllamaServiceStatus>({
    isRunning: false,
    lastChecked: new Date(),
  });
  const [loading, setLoading] = useState({
    errors: false,
    performance: false,
  });
  const [openSections, setOpenSections] = useState({
    system: false,
    webapp: false,
    errors: false,
    performance: false,
  });

  const { providers } = useSettings();

  const logs = useStore(logStore.logs);
  const errorLogs = useMemo(() => {
    return Object.values(logs).filter(
      (log): log is LogEntry => typeof log === 'object' && log !== null && 'level' in log && log.level === 'error',
    );
  }, [logs]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      logStore.logError(event.message, event.error, {
        filename: event.filename,
        lineNumber: event.lineno,
        columnNumber: event.colno,
      });
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      logStore.logError('Unhandled Promise Rejection', event.reason);
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  useEffect(() => {
    if (openSections.errors) {
      checkErrors();
    }
  }, [openSections.errors]);

  useEffect(() => {
    // These will trigger if not already loaded or if explicitly called by button
    if (openSections.system && !systemInfo) {
      triggerGetSystemInfo();
    }
    if (openSections.webapp && !webAppInfo) {
      triggerGetWebAppInfo();
    }
  }, [openSections.system, openSections.webapp, systemInfo, webAppInfo, triggerGetSystemInfo, triggerGetWebAppInfo]);

  // Periodic Git info refresh
  useEffect(() => {
    if (!openSections.webapp || !webAppInfo) { // Only run if webapp section is open and initial data is there
      return undefined;
    }
    const fetchGitInfoOnly = async () => {
      try {
        const response = await fetch('/api/system/git-info');
        if (!response.ok) throw new Error('Failed to fetch git info');
        const updatedGitInfo = (await response.json()) as GitInfo;
        setWebAppInfo((prev) => {
          if (!prev) return null; // Should not happen if webAppInfo is already set
          // Only update if gitInfo has actually changed to prevent unnecessary re-renders
          if (JSON.stringify(prev.gitInfo) === JSON.stringify(updatedGitInfo)) return prev;
          return { ...prev, gitInfo: updatedGitInfo };
        });
      } catch (error) {
        console.error('Failed to fetch git info periodically:', error);
        // Optionally, show a subtle error to the user, but avoid toasts for background tasks
      }
    };
    fetchGitInfoOnly(); // Initial fetch when section opens if needed (or rely on main fetch)
    const interval = setInterval(fetchGitInfoOnly, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [openSections.webapp, webAppInfo, setWebAppInfo]);


  const handleLogPerformance = () => {
    try {
      setLoading((prev) => ({ ...prev, performance: true }));
      const performanceEntries = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const memory = (performance as any).memory;
      const timingMetrics = {
        loadTime: performanceEntries.loadEventEnd - performanceEntries.startTime,
        domReadyTime: performanceEntries.domContentLoadedEventEnd - performanceEntries.startTime,
        fetchTime: performanceEntries.responseEnd - performanceEntries.fetchStart,
        redirectTime: performanceEntries.redirectEnd - performanceEntries.redirectStart,
        dnsTime: performanceEntries.domainLookupEnd - performanceEntries.domainLookupStart,
        tcpTime: performanceEntries.connectEnd - performanceEntries.connectStart,
        ttfb: performanceEntries.responseStart - performanceEntries.requestStart,
        processingTime: performanceEntries.loadEventEnd - performanceEntries.responseEnd,
      };
      const resourceEntries = performance.getEntriesByType('resource');
      const resourceStats = {
        totalResources: resourceEntries.length,
        totalSize: resourceEntries.reduce((total, entry) => total + ((entry as any).transferSize || 0), 0),
        totalTime: Math.max(...resourceEntries.map((entry) => entry.duration)),
      };
      const memoryMetrics = memory
        ? { jsHeapSizeLimit: memory.jsHeapSizeLimit, totalJSHeapSize: memory.totalJSHeapSize, usedJSHeapSize: memory.usedJSHeapSize, heapUtilization: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100 }
        : null;
      let fps = 0; // Simplified FPS, actual calculation is more complex
      if ('requestAnimationFrame' in window) {
        const times: number[] = [];
        function calculateFPS(now: number) { // Basic FPS calculation
          times.push(now);
          if (times.length > 10) { const fpsValue = Math.round((1000 * 10) / (now - times[0])); times.shift(); return fpsValue; }
          requestAnimationFrame(calculateFPS); return 0;
        }
        fps = calculateFPS(performance.now());
      }
      logStore.logSystem('Performance Metrics', {
        timing: timingMetrics, resources: resourceStats, memory: memoryMetrics, fps,
        timestamp: new Date().toISOString(),
        navigationEntry: { type: performanceEntries.type, redirectCount: performanceEntries.redirectCount },
      });
      toast.success('Performance metrics logged');
    } catch (error) {
      toast.error('Failed to log performance metrics');
    } finally {
      setLoading((prev) => ({ ...prev, performance: false }));
    }
  };

  const checkErrors = async () => {
    try {
      setLoading((prev) => ({ ...prev, errors: true }));
      // errorLogs is already reactive from useMemo
      if (errorLogs.length === 0) toast.success('No errors found');
      else toast.warning(`Found ${errorLogs.length} error(s)`);
    } catch (error) {
      toast.error('Failed to check errors');
    } finally {
      setLoading((prev) => ({ ...prev, errors: false }));
    }
  };

  const getRawDebugData = useCallback(() => ({
    timestamp: new Date().toISOString(),
    system: systemInfo, webApp: webAppInfo,
    errors: logStore.getLogs().filter((log: LogEntry) => log.level === 'error'), // Get current errors
    performance: { memory: (performance as any).memory || {}, timing: performance.timing, navigation: performance.navigation },
  }), [systemInfo, webAppInfo]); // Removed logs from deps as getLogs() is stable

  const handleExportJson = useCallback(() => {
    try {
      const debugData = getRawDebugData();
      exportAsJson(debugData, `bolt-debug-info-${new Date().toISOString().split('T')[0]}`);
      toast.success('Debug information exported as JSON');
    } catch (error) {
      console.error('Failed to export JSON:', error);
      toast.error('Failed to export debug information as JSON');
    }
  }, [getRawDebugData]);

  const handleExportText = useCallback(() => {
    try {
      const debugData = getRawDebugData();
      const textContent = Object.entries(debugData)
        .map(([category, data]) => `${category.toUpperCase()}\n${'-'.repeat(30)}\n${JSON.stringify(data, null, 2)}\n\n`)
        .join('\n');
      exportAsText(textContent, `bolt-debug-info-${new Date().toISOString().split('T')[0]}`);
      toast.success('Debug information exported as text file');
    } catch (error) {
      console.error('Failed to export text file:', error);
      toast.error('Failed to export debug information as text file');
    }
  }, [getRawDebugData]);

  const handleExportCsv = useCallback(() => {
    try {
      const debugData = getRawDebugData();
      const csvDataRows = [];
      csvDataRows.push(['Category', 'Key', 'Value']); // Header

      Object.entries(debugData).forEach(([category, data]) => {
        if (data && typeof data === 'object') {
          Object.entries(data).forEach(([key, value]) => {
            if (value && typeof value === 'object' && !Array.isArray(value)) { // Nested objects
              Object.entries(value).forEach(([subKey, subValue]) => {
                csvDataRows.push([category, `${key}.${subKey}`, String(subValue)]);
              });
            } else {
              csvDataRows.push([category, key, Array.isArray(value) ? JSON.stringify(value) : String(value)]);
            }
          });
        }
      });

      const csvContent = csvDataRows.map((row) => row.join(',')).join('\n');
      genericDownloadFile(csvContent, `bolt-debug-info-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
      toast.success('Debug information exported as CSV');
    } catch (error) {
      console.error('Failed to export CSV:', error);
      toast.error('Failed to export debug information as CSV');
    }
  }, [getRawDebugData]);

  const directExportAsPDF = useCallback(() => {
    try {
      const debugData = getRawDebugData();
      const doc = new jsPDF();
      const lineHeight = 7; let yPos = 20; const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth(); const maxLineWidth = pageWidth - 2 * margin;

      const addKeyValue = (key: string, value: any, indent = 0) => {
        if (yPos > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); yPos = margin; } // Check space before drawing
        doc.setFontSize(10); doc.setTextColor('#374151'); doc.setFont('helvetica', 'bold');
        const formattedKey = key.replace(/([A-Z])/g, ' $1').trim(); // Add space before caps
        doc.text(formattedKey + ':', margin + indent, yPos);
        doc.setFont('helvetica', 'normal'); doc.setTextColor('#6B7280');
        let valueText;
        if (typeof value === 'object' && value !== null) {
          if (Object.keys(value).length === 0) {yPos += lineHeight; return;} // Skip empty objects but advance yPos
          yPos += lineHeight; // Space for sub-items
          Object.entries(value).forEach(([subKey, subValue]) => {
            if (yPos > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); yPos = margin; }
            addKeyValue(subKey, subValue, indent + 10);
          });
          return;
        } else { valueText = String(value); }

        const valueX = margin + indent + doc.getTextWidth(formattedKey + ': ') + 2; // Add small gap
        const maxValueWidth = maxLineWidth - indent - doc.getTextWidth(formattedKey + ': ') - 2;
        const lines = doc.splitTextToSize(valueText, maxValueWidth > 0 ? maxValueWidth : 10); // Ensure maxValueWidth is positive

        if (yPos + (lines.length * lineHeight) > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); yPos = margin; }
        doc.text(lines, valueX, yPos);
        yPos += lines.length * lineHeight;
      };
      const addSectionHeader = (title: string) => {
        if (yPos + 20 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); yPos = margin; }
        yPos += lineHeight; doc.setFillColor('#F3F4F6');
        doc.rect(margin - 5, yPos - lineHeight*0.8, pageWidth - 2 * (margin - 5), lineHeight + 2, 'F'); // Background rect
        doc.setFont('helvetica', 'bold'); doc.setTextColor('#111827'); doc.setFontSize(12);
        doc.text(title.toUpperCase(), margin, yPos); doc.setFont('helvetica', 'normal'); yPos += lineHeight * 1.5;
      };
      const addHorizontalLine = () => {
        if (yPos + 10 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); yPos = margin; return; }
        doc.setDrawColor('#E5E5E5'); doc.line(margin, yPos, pageWidth - margin, yPos); yPos += lineHeight;
      };
      const addFooters = () => {
        const totalPages = (doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : doc.internal.pages.length -1;
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i); doc.setFontSize(8); doc.setTextColor('#9CA3AF');
          doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        }
      };
      doc.setFillColor('#6366F1'); doc.rect(0, 0, pageWidth, 40, 'F'); // Header Banner
      doc.setTextColor('#FFFFFF'); doc.setFontSize(24); doc.setFont('helvetica', 'bold');
      doc.text('Debug Information Report', margin, 25); yPos = 50;
      doc.setTextColor('#6B7280'); doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      const timestamp = new Date().toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
      doc.text(`Generated: ${timestamp}`, margin, yPos); yPos += lineHeight * 2;

      if (debugData.system) {
        addSectionHeader('System Information');
        addKeyValue('Operating System', debugData.system.os); addKeyValue('Architecture', debugData.system.arch);
        addKeyValue('Platform', debugData.system.platform); addKeyValue('CPU Cores', debugData.system.cpus);
        if(debugData.system.memory) addKeyValue('Memory', debugData.system.memory);
        if(debugData.system.browser) addKeyValue('Browser', debugData.system.browser);
        if(debugData.system.screen) addKeyValue('Screen', debugData.system.screen);
        if(debugData.system.time) addKeyValue('Time Settings', debugData.system.time);
        addHorizontalLine();
      }
      if (debugData.webApp) {
        addSectionHeader('Web App Information');
        addKeyValue('Application', { Name: debugData.webApp.name, Version: debugData.webApp.version, Environment: debugData.webApp.environment });
        if(debugData.webApp.runtimeInfo) addKeyValue('Runtime', debugData.webApp.runtimeInfo);
        if (debugData.webApp.gitInfo && debugData.webApp.gitInfo.local) {
          addKeyValue('Git (Local)', debugData.webApp.gitInfo.local);
        }
        if (debugData.webApp.gitInfo && debugData.webApp.gitInfo.github && debugData.webApp.gitInfo.github.currentRepo) {
           addKeyValue('Git (GitHub)', { ...debugData.webApp.gitInfo.github.currentRepo, IsFork: debugData.webApp.gitInfo.isForked});
        }
        addHorizontalLine();
      }
      if (debugData.performance) {
        addSectionHeader('Performance Metrics');
         if(debugData.performance.memory) addKeyValue('JS Heap', debugData.performance.memory);
         if(debugData.performance.timing) {
            const perfTiming = debugData.performance.timing as any; // Cast for easier access
            addKeyValue('Page Load Metrics', {
                'Total Load Time': perfTiming.loadTime ? (perfTiming.loadTime / 1000).toFixed(2) + 's' : 'N/A',
                'DOM Ready Time': perfTiming.domReadyTime ? (perfTiming.domReadyTime / 1000).toFixed(2) + 's' : 'N/A',
                'Request Time': perfTiming.requestTime ? (perfTiming.requestTime / 1000).toFixed(2) + 's' : 'N/A'
            });
         }
        if (debugData.system?.network) { // Network info is under system
          addKeyValue('Network Information', debugData.system.network);
        }
        addHorizontalLine();
      }
      if (debugData.errors && debugData.errors.length > 0) {
        addSectionHeader('Error Log');
        debugData.errors.forEach((error: LogEntry, index: number) => {
          if (yPos + 4 * lineHeight > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); yPos = margin; }
          doc.setTextColor('#DC2626'); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
          doc.text(`Error ${index + 1}:`, margin, yPos); yPos += lineHeight;
          doc.setFont('helvetica', 'normal'); doc.setTextColor('#6B7280');
          addKeyValue('Message', error.message, 10);
          if (error.stack) addKeyValue('Stack', error.stack.substring(0, 200) + (error.stack.length > 200 ? '...' : ''), 10); // Truncate stack
          if (error.source) addKeyValue('Source', error.source, 10);
          yPos += lineHeight; // Extra space between errors
        });
      }
      addFooters();
      doc.save(`bolt-debug-info-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Debug information exported as PDF');
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast.error('Failed to export debug information as PDF');
    }
  }, [getRawDebugData]);

  const finalExportFormats: ExportFormatOption[] = useMemo(() => [
    { id: 'json', label: 'Export as JSON', icon: 'i-ph:file-js', description: 'Structured JSON file with all debug information.', handler: handleExportJson },
    { id: 'csv', label: 'Export as CSV', icon: 'i-ph:file-csv', description: 'Summarized data in CSV format.', handler: handleExportCsv },
    { id: 'pdf', label: 'Export as PDF', icon: 'i-ph:file-pdf', description: 'Formatted PDF document of the debug report.', handler: directExportAsPDF },
    { id: 'txt', label: 'Export as Text', icon: 'i-ph:file-text', description: 'Plain text formatted debug information.', handler: handleExportText },
  ], [handleExportJson, handleExportCsv, directExportAsPDF, handleExportText]);

  const checkOllamaStatus = useCallback(async () => {
    try {
      const ollamaProvider = providers?.Ollama;
      const baseUrl = ollamaProvider?.settings?.baseUrl || 'http://127.0.0.1:11434';
      const versionResponse = await fetch(`${baseUrl}/api/version`);
      if (!versionResponse.ok) throw new Error(`Service not running or bad response: ${versionResponse.status}`);
      const modelsResponse = await fetch(`${baseUrl}/api/tags`);
      if (!modelsResponse.ok) throw new Error(`Failed to fetch models: ${modelsResponse.status}`);
      const modelsData = (await modelsResponse.json()) as { models: Array<{ name: string; size: string; quantization: string }> };
      setOllamaStatus({ isRunning: true, lastChecked: new Date(), models: modelsData.models });
    } catch(e: any) {
      setOllamaStatus({ isRunning: false, error: e.message || 'Connection failed', lastChecked: new Date(), models: undefined });
    }
  }, [providers]);

  useEffect(() => {
    const ollamaProvider = providers?.Ollama;
    if (ollamaProvider?.settings?.enabled) {
      checkOllamaStatus();
      const intervalId = setInterval(checkOllamaStatus, 10000); // Check every 10 seconds
      return () => clearInterval(intervalId);
    }
    return undefined;
  }, [providers, checkOllamaStatus]);

  const getOllamaStatus = () => {
    const ollamaProvider = providers?.Ollama;
    const isOllamaEnabled = ollamaProvider?.settings?.enabled;
    if (!isOllamaEnabled) return { status: 'Disabled', color: 'text-red-500 dark:text-red-400', bgColor: 'bg-red-500/20 dark:bg-red-400/20', message: 'Ollama provider is disabled in settings' };
    if (!ollamaStatus.isRunning) return { status: 'Not Running', color: 'text-red-500 dark:text-red-400', bgColor: 'bg-red-500/20 dark:bg-red-400/20', message: ollamaStatus.error || 'Ollama service is not running' };
    const modelCount = ollamaStatus.models?.length ?? 0;
    return { status: 'Running', color: 'text-green-500 dark:text-green-400', bgColor: 'bg-green-500/20 dark:bg-green-400/20', message: `Ollama service is running with ${modelCount} installed models.` };
  };

  type StatusResult = { status: string; color: string; bgColor: string; message: string; };
  const status = getOllamaStatus() as StatusResult; // Type assertion for simplicity

  const [isNotSupported, setIsNotSupported] = useState<boolean>(false);
  const isDevelopment = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('192.168.') || window.location.hostname.includes('.local'));

  const isServerlessHosting = (): boolean => {
    if (typeof window === 'undefined') return false;
    // Allow overriding with query param for testing
    if (window.location.search.includes('simulate-serverless=true')) return true;
    if (window.location.search.includes('simulate-serverless=false')) return false;

    const hostname = window.location.hostname;
    return hostname.includes('.cloudflare.') ||
           hostname.includes('.netlify.app') ||
           hostname.includes('.vercel.app') ||
           hostname.endsWith('.workers.dev');
  };

   useEffect(() => {
    const checkEnvironment = async () => {
      if (isServerlessHosting()) { setIsNotSupported(true); return; }
      if (typeof window !== 'undefined' && window.location.search.includes('simulate-api-failure=true')) { setIsNotSupported(true); return; }
      // Optional: A light check to an API endpoint that requires server context
      try {
        // Example: Try fetching a small piece of info that would fail in serverless
        const response = await fetch('/api/system/app-info?check=true'); // A lightweight check
        if (!response.ok && response.status === 404) { // Or specific error indicating serverless
            // Heuristic: if a key server-side API is missing, assume serverless or similar limited env
            // This is a fallback if hostname checks are not enough
            // console.warn('System API check failed, assuming limited environment.');
            // setIsNotSupported(true);
        }
      } catch (error) {
        // console.warn('Failed to perform environment check. Features may be limited:', error);
        // setIsNotSupported(true); // If any fetch fails, might be serverless
      }
    };
    checkEnvironment();
  }, []);


  if (isNotSupported) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center h-full">
        <div className="i-ph:cloud-slash-fill w-12 h-12 sm:w-16 sm:h-16 text-bolt-elements-textTertiary mb-3 sm:mb-4" />
        <h3 className="text-base sm:text-lg font-medium text-bolt-elements-textPrimary mb-1.5 sm:mb-2">System Monitoring Not Available</h3>
        <p className="text-xs sm:text-sm text-bolt-elements-textSecondary mb-4 sm:mb-6 max-w-md">
          Detailed system monitoring and some debug features are not available in the current hosting environment (e.g., serverless platforms like Cloudflare Pages, Netlify, or Vercel) as they do not provide access to underlying system resources.
        </p>
        <div className="flex flex-col gap-1.5 sm:gap-2 bg-bolt-background-secondary dark:bg-bolt-backgroundDark-secondary p-3 sm:p-4 rounded-lg text-xs sm:text-sm text-left max-w-md">
          <p className="text-bolt-elements-textSecondary">
            <span className="font-medium text-bolt-elements-textPrimary">Why is this section limited?</span>
            <br />
            Serverless platforms execute code in isolated environments without direct access to server OS metrics (CPU, full memory stats, disk usage). Client-side info is still available.
          </p>
          <p className="text-bolt-elements-textSecondary mt-1.5 sm:mt-2">
            Full system monitoring features are typically available when running in:
            <ul className="list-disc pl-4 sm:pl-6 mt-1 text-bolt-elements-textSecondary">
              <li>Local development environment</li>
              <li>Virtual Machines (VMs)</li>
              <li>Dedicated servers</li>
              <li>Docker containers (with appropriate permissions/setup)</li>
            </ul>
          </p>
        </div>

        {isDevelopment && (
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 border border-dashed border-bolt-elements-border dark:border-bolt-elements-borderDark rounded-lg">
            <h4 className="text-xs sm:text-sm font-medium text-bolt-elements-textPrimary mb-1.5 sm:mb-2">Development Testing Controls</h4>
            <p className="text-[10px] sm:text-xs text-bolt-elements-textSecondary mb-2 sm:mb-3">
              (Visible in development mode only)
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="xs">
                <a href="?simulate-serverless=false">Normal Mode</a>
              </Button>
              <Button asChild variant="default" size="xs">
                 <a href="?simulate-serverless=true">Simulate Serverless</a>
              </Button>
              <Button asChild variant="destructive" size="xs">
                <a href="?simulate-api-failure=true">Simulate API Failures</a>
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 max-w-7xl mx-auto p-2 sm:p-3 md:p-4">
      {/* Quick Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A] hover:border-purple-500/30 dark:hover:border-purple-400/40 transition-all duration-200 min-h-[120px] sm:min-h-[150px] md:min-h-[170px] flex flex-col">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="i-ph:warning-octagon text-purple-500 dark:text-purple-400 w-4 h-4" />
            <div className="text-xs sm:text-sm text-bolt-elements-textSecondary">Errors</div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-2">
            <span
              className={classNames('text-xl sm:text-2xl font-semibold', errorLogs.length > 0 ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400')}
            >
              {errorLogs.length}
            </span>
          </div>
          <div className="text-[10px] sm:text-xs text-bolt-elements-textSecondary mt-1 sm:mt-2 flex items-center gap-1 sm:gap-1.5">
            <div
              className={classNames(
                'w-3.5 h-3.5',
                errorLogs.length > 0 ? 'i-ph:warning text-red-500 dark:text-red-400' : 'i-ph:check-circle text-green-500 dark:text-green-400',
              )}
            />
            {errorLogs.length > 0 ? 'Errors detected' : 'No errors detected'}
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A] hover:border-purple-500/30 dark:hover:border-purple-400/40 transition-all duration-200 min-h-[120px] sm:min-h-[150px] md:min-h-[170px] flex flex-col">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="i-ph:cpu text-purple-500 dark:text-purple-400 w-4 h-4" />
            <div className="text-xs sm:text-sm text-bolt-elements-textSecondary">JS Heap Usage</div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-2">
            <span
              className={classNames(
                'text-xl sm:text-2xl font-semibold',
                (systemInfo?.performance.memory?.usagePercentage ?? 0) > 80
                  ? 'text-red-500 dark:text-red-400'
                  : (systemInfo?.performance.memory?.usagePercentage ?? 0) > 60
                    ? 'text-yellow-500 dark:text-yellow-400'
                    : 'text-green-500 dark:text-green-400',
              )}
            >
              {systemInfo?.performance.memory?.usagePercentage?.toFixed(0) ?? 0}%
            </span>
          </div>
          <Progress
            value={systemInfo?.performance.memory?.usagePercentage ?? 0}
            className={classNames(
              'mt-1 sm:mt-2 h-2 sm:h-2.5',
              (systemInfo?.performance.memory?.usagePercentage ?? 0) > 80
                ? '[&>div]:bg-red-500 dark:[&>div]:bg-red-400'
                : (systemInfo?.performance.memory?.usagePercentage ?? 0) > 60
                  ? '[&>div]:bg-yellow-500 dark:[&>div]:bg-yellow-400'
                  : '[&>div]:bg-green-500 dark:[&>div]:bg-green-400',
            )}
          />
          <div className="text-[10px] sm:text-xs text-bolt-elements-textSecondary mt-1 sm:mt-2 flex items-center gap-1 sm:gap-1.5">
            <div className="i-ph:info w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
            Used: {systemInfo?.performance.memory.usedJSHeapSize ? formatBytes(systemInfo.performance.memory.usedJSHeapSize) : 'N/A'}
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A] hover:border-purple-500/30 dark:hover:border-purple-400/40 transition-all duration-200 min-h-[120px] sm:min-h-[150px] md:min-h-[170px] flex flex-col">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="i-ph:timer text-purple-500 dark:text-purple-400 w-4 h-4" />
            <div className="text-xs sm:text-sm text-bolt-elements-textSecondary">Page Load Time</div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-2">
            <span
              className={classNames(
                'text-xl sm:text-2xl font-semibold',
                (systemInfo?.performance.timing.loadTime ?? 0) > 2000
                  ? 'text-red-500 dark:text-red-400'
                  : (systemInfo?.performance.timing.loadTime ?? 0) > 1000
                    ? 'text-yellow-500 dark:text-yellow-400'
                    : 'text-green-500 dark:text-green-400',
              )}
            >
              {systemInfo ? (systemInfo.performance.timing.loadTime / 1000).toFixed(2) : '-'}s
            </span>
          </div>
          <div className="text-[10px] sm:text-xs text-bolt-elements-textSecondary mt-1 sm:mt-2 flex items-center gap-1 sm:gap-1.5">
            <div className="i-ph:code w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
            DOM Ready: {systemInfo ? (systemInfo.performance.timing.domReadyTime / 1000).toFixed(2) : '-'}s
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A] hover:border-purple-500/30 dark:hover:border-purple-400/40 transition-all duration-200 min-h-[120px] sm:min-h-[150px] md:min-h-[170px] flex flex-col">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="i-ph:wifi-high text-purple-500 dark:text-purple-400 w-4 h-4" />
            <div className="text-xs sm:text-sm text-bolt-elements-textSecondary">Network Speed</div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-2">
            <span
              className={classNames(
                'text-xl sm:text-2xl font-semibold',
                (systemInfo?.network.downlink ?? 0) < 5 && systemInfo?.network.effectiveType !== '4g'
                  ? 'text-red-500 dark:text-red-400'
                  : (systemInfo?.network.downlink ?? 0) < 10 && systemInfo?.network.effectiveType !== '4g'
                    ? 'text-yellow-500 dark:text-yellow-400'
                    : 'text-green-500 dark:text-green-400',
              )}
            >
              {systemInfo?.network.downlink ? `${systemInfo.network.downlink} Mbps` : systemInfo?.network.effectiveType || '-'}
            </span>
          </div>
          <div className="text-[10px] sm:text-xs text-bolt-elements-textSecondary mt-1 sm:mt-2 flex items-center gap-1 sm:gap-1.5">
            <div className="i-ph:activity w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
            RTT: {systemInfo?.network.rtt ?? '-'} ms {systemInfo?.network.type && `(${systemInfo.network.type})`}
          </div>
        </div>

        <div className="md:col-span-4 p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A] hover:border-purple-500/30 dark:hover:border-purple-400/40 transition-all duration-200 min-h-[200px] sm:min-h-[230px] md:h-[260px] flex flex-col">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="i-ph:robot text-purple-500 dark:text-purple-400 w-5 h-5" />
              <div>
                <div className="text-sm sm:text-base font-medium text-bolt-elements-textPrimary">Ollama Service</div>
                <div className="text-xs text-bolt-elements-textSecondary mt-0.5">{status.message}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-0">
              <div className={classNames("flex items-center gap-1.5 sm:gap-2 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full", status.bgColor)}>
                <div
                  className={classNames('w-2 h-2 rounded-full animate-pulse', status.status === 'Running' ? 'bg-green-500' : 'bg-red-500', {
                    'shadow-lg shadow-green-500/20': status.status === 'Running',
                    'shadow-lg shadow-red-500/20': status.status !== 'Running',
                  })}
                />
                <span className={classNames('text-[10px] sm:text-xs font-medium flex items-center gap-1', status.color)}>
                  {status.status}
                </span>
              </div>
              <div className="text-[10px] text-bolt-elements-textTertiary flex items-center gap-1 sm:gap-1.5">
                <div className="i-ph:clock w-3 h-3" />
                {ollamaStatus.lastChecked.toLocaleTimeString()}
              </div>
            </div>
          </div>

          <div className="mt-3 sm:mt-4 md:mt-6 flex-1 min-h-0 flex flex-col">
            {status.status === 'Running' && ollamaStatus.models && ollamaStatus.models.length > 0 ? (
              <>
                <div className="text-[10px] sm:text-xs font-medium text-bolt-elements-textSecondary flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="i-ph:cube-duotone w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500 dark:text-purple-400" />
                    <span>Installed Models</span>
                    <Badge variant="secondary" className="ml-1 text-[9px] sm:text-[10px] px-1 sm:px-1.5">
                      {ollamaStatus.models.length}
                    </Badge>
                  </div>
                </div>
                <ScrollArea className="flex-1 pr-1 sm:pr-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {ollamaStatus.models.map((model) => (
                      <div
                        key={model.name}
                        className="text-xs sm:text-sm bg-bolt-elements-background-depth-3 dark:bg-bolt-elements-backgroundDark-depth-3 hover:bg-bolt-elements-background-depth-4 dark:hover:bg-bolt-elements-backgroundDark-depth-4 rounded-md sm:rounded-lg px-2.5 py-2 sm:px-3 sm:py-2.5 flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2 text-bolt-elements-textSecondary">
                          <div className="i-ph:cube w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500/70 dark:text-purple-400/70 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors" />
                          <span className="font-mono truncate">{model.name}</span>
                        </div>
                        <Badge variant="outline" className="ml-2 text-[9px] sm:text-xs font-mono px-1 sm:px-1.5">
                          {formatBytes(parseInt(model.size))} {/* Assuming model.size is in bytes */}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 sm:gap-3 max-w-[240px] sm:max-w-[280px] text-center">
                  <div
                    className={classNames('w-10 h-10 sm:w-12 sm:h-12', {
                      'i-ph:warning-circle text-red-500/80 dark:text-red-400/80':
                        status.status === 'Not Running' || status.status === 'Disabled',
                      'i-ph:cube-duotone text-purple-500/80 dark:text-purple-400/80': status.status === 'Running' && (!ollamaStatus.models || ollamaStatus.models.length === 0),
                    })}
                  />
                  <span className="text-xs sm:text-sm text-bolt-elements-textSecondary">
                    {status.status === 'Running' && (!ollamaStatus.models || ollamaStatus.models.length === 0)
                      ? 'Ollama is running but no models found.'
                      : status.message}
                    </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4">
        <Button
          onClick={() => triggerGetSystemInfo({ force: true })}
          disabled={isLoadingSystemInfo}
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 sm:gap-2"
        >
          {isLoadingSystemInfo ? (
            <div className="i-ph:spinner-gap w-4 h-4 animate-spin" />
          ) : (
            <div className="i-ph:arrows-clockwise w-4 h-4" />
          )}
          Refresh System Info
        </Button>

        <Button
          onClick={handleLogPerformance}
          disabled={loading.performance}
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 sm:gap-2"
        >
          {loading.performance ? (
            <div className="i-ph:spinner-gap w-4 h-4 animate-spin" />
          ) : (
            <div className="i-ph:chart-bar w-4 h-4" />
          )}
          Log Performance
        </Button>

        <Button
          onClick={checkErrors}
          disabled={loading.errors}
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 sm:gap-2"
        >
          {loading.errors ? (
            <div className="i-ph:spinner-gap w-4 h-4 animate-spin" />
          ) : (
            <div className="i-ph:warning w-4 h-4" />
          )}
          Check Errors
        </Button>

        <Button
          onClick={() => triggerGetWebAppInfo({ force: true })}
          disabled={isLoadingWebAppInfo}
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 sm:gap-2"
        >
          {isLoadingWebAppInfo ? (
            <div className="i-ph:spinner-gap w-4 h-4 animate-spin" />
          ) : (
            <div className="i-ph:arrows-clockwise w-4 h-4" />
          )}
          Refresh WebApp Info
        </Button>
        <ExportButtonDialog exportFormats={finalExportFormats} triggerButtonLabel="Export Debug Info" dialogIcon="i-ph:export-duotone" />
      </div>

      {/* Collapsible Sections */}
      <Collapsible open={openSections.system} onOpenChange={(open) => setOpenSections((prev) => ({ ...prev, system: open }))} className="w-full">
        <CollapsibleTrigger className="w-full">
          <SectionHeader
            icon="i-ph:cpu"
            title="System Information"
            className="mb-0 p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A] hover:border-purple-500/30 dark:hover:border-purple-400/40"
            actions={<div className={classNames('i-ph:caret-down w-4 h-4 transform transition-transform duration-200', openSections.system ? 'rotate-180' : '')}/>}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 sm:p-4 md:p-6 mt-1 sm:mt-2 rounded-lg sm:rounded-xl bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A]">
            {isLoadingSystemInfo && !systemInfo && <div className="text-xs sm:text-sm text-bolt-elements-textSecondary text-center py-4">Loading system information...</div>}
            {systemInfo && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 sm:gap-x-4 md:gap-x-6 gap-y-1 sm:gap-y-1.5">
                <DetailItem label="OS" value={systemInfo.os} icon="i-ph:desktop" />
                <DetailItem label="Platform" value={systemInfo.platform} icon="i-ph:device-mobile" />
                <DetailItem label="Architecture" value={systemInfo.arch} icon="i-ph:circuitry" />
                <DetailItem label="CPU Cores" value={systemInfo.cpus} icon="i-ph:cpu" />
                {/* Node version is client-side only, so it's "browser" */}
                <DetailItem label="Environment" value={systemInfo.node} icon="i-ph:code-block" />
                <DetailItem label="Network Type" value={`${systemInfo.network.type} (${systemInfo.network.effectiveType})`} icon="i-ph:wifi-high" />
                <DetailItem label="Network Speed" value={`${systemInfo.network.downlink}Mbps (RTT: ${systemInfo.network.rtt}ms)`} icon="i-ph:gauge" />
                {systemInfo.battery && <DetailItem label="Battery" value={`${systemInfo.battery.level.toFixed(0)}% ${systemInfo.battery.charging ? '(Charging)' : ''}`} icon={systemInfo.battery.charging ? 'i-ph:battery-charging-vertical' : 'i-ph:battery-high'} />}
                <DetailItem label="Storage (Estimated)" value={`${formatBytes(systemInfo.storage.usage)} / ${formatBytes(systemInfo.storage.quota)}`} icon="i-ph:hard-drive" />
                <DetailItem label="Memory (JS Heap)" value={`${systemInfo.memory.used} / ${systemInfo.memory.total} (${systemInfo.memory.percentage}%)`} icon="i-ph:database" />
                <DetailItem label="Browser" value={`${systemInfo.browser.name} ${systemInfo.browser.version}`} icon="i-ph:browser" />
                <DetailItem label="Screen" value={`${systemInfo.screen.width}x${systemInfo.screen.height} (${systemInfo.screen.pixelRatio}x)`} icon="i-ph:monitor" />
                <DetailItem label="Timezone" value={systemInfo.time.timezone} icon="i-ph:clock" />
                <DetailItem label="Language" value={systemInfo.browser.language} icon="i-ph:translate" />
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

       <Collapsible open={openSections.performance} onOpenChange={(open) => setOpenSections((prev) => ({ ...prev, performance: open }))} className="w-full">
        <CollapsibleTrigger className="w-full">
           <SectionHeader
            icon="i-ph:chart-line"
            title="Performance Overview"
            className="mb-0 p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A] hover:border-purple-500/30 dark:hover:border-purple-400/40"
            actions={<div className={classNames('i-ph:caret-down w-4 h-4 transform transition-transform duration-200', openSections.performance ? 'rotate-180' : '')}/>}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 sm:p-4 md:p-6 mt-1 sm:mt-2 rounded-lg sm:rounded-xl bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A]">
            {isLoadingSystemInfo && !systemInfo && <div className="text-xs sm:text-sm text-bolt-elements-textSecondary text-center py-4">Loading performance data...</div>}
            {systemInfo && systemInfo.performance && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 sm:gap-x-4 md:gap-x-6 gap-y-1 sm:gap-y-1.5">
                <DetailItem label="Total Page Load" value={`${(systemInfo.performance.timing.loadTime / 1000).toFixed(2)}s`} icon="i-ph:timer" />
                <DetailItem label="DOM Content Loaded" value={`${(systemInfo.performance.timing.domReadyTime / 1000).toFixed(2)}s`} icon="i-ph:file-code" />
                <DetailItem label="Request Time" value={`${(systemInfo.performance.timing.requestTime / 1000).toFixed(2)}s`} icon="i-ph:airplane-takeoff"/>
                <DetailItem label="Redirect Time" value={`${(systemInfo.performance.timing.redirectTime / 1000).toFixed(2)}s`} icon="i-ph:arrows-clockwise" />
                <DetailItem label="JS Heap Usage" value={`${formatBytes(systemInfo.performance.memory.usedJSHeapSize)} / ${formatBytes(systemInfo.performance.memory.totalJSHeapSize)} (${systemInfo.performance.memory.usagePercentage.toFixed(1)}%)`} icon="i-ph:chart-pie-slice" />
                <DetailItem label="Navigation Type" value={systemInfo.performance.navigation.type === 0 ? 'Navigate' : systemInfo.performance.navigation.type === 1 ? 'Reload' : systemInfo.performance.navigation.type === 2 ? 'Back/Forward' : 'Other'} icon="i-ph:navigation-arrow" />
                <DetailItem label="Redirects" value={systemInfo.performance.navigation.redirectCount.toString()} icon="i-ph:git-merge" />
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={openSections.webapp} onOpenChange={(open) => setOpenSections((prev) => ({ ...prev, webapp: open }))} className="w-full">
        <CollapsibleTrigger className="w-full">
          <SectionHeader
            icon="i-ph:info"
            title="WebApp Information"
            iconContainerClassName="text-blue-500 dark:text-blue-400"
            className="mb-0 p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A] hover:border-purple-500/30 dark:hover:border-purple-400/40"
            actions={isLoadingWebAppInfo ? <div className="i-ph:spinner-gap w-4 h-4 animate-spin" /> : <div className={classNames('i-ph:caret-down w-4 h-4 transform transition-transform duration-200', openSections.webapp ? 'rotate-180' : '')}/>}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 sm:p-4 md:p-6 mt-1 sm:mt-2 rounded-lg sm:rounded-xl bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A]">
            {isLoadingWebAppInfo && !webAppInfo && <div className="flex items-center justify-center p-6 sm:p-8"><div className="i-ph:spinner-gap w-8 h-8 animate-spin text-purple-500 dark:text-purple-400" /></div>}
            {!isLoadingWebAppInfo && !webAppInfo && (
              <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-bolt-elements-textSecondary">
                <div className="i-ph:warning-circle w-6 h-6 sm:w-8 sm:h-8 mb-1.5 sm:mb-2" />
                <p className="text-xs sm:text-sm">Failed to load WebApp information</p>
                <Button onClick={() => triggerGetWebAppInfo({ force: true })} size="sm" className="mt-3 sm:mt-4">Retry</Button>
              </div>
            )}
            {webAppInfo && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 sm:gap-x-4 md:gap-x-6 gap-y-1 sm:gap-y-1.5">
                <DetailItem label="Name" value={webAppInfo.name} icon="i-ph:app-window" />
                <DetailItem label="Version" value={webAppInfo.version} icon="i-ph:tag" />
                <DetailItem label="License" value={webAppInfo.license} icon="i-ph:certificate" />
                <DetailItem label="Environment" value={webAppInfo.environment} icon="i-ph:cloud" />
                <DetailItem label="Server Node Version" value={webAppInfo.runtimeInfo.nodeVersion} icon="i-ph:graph" />
                {webAppInfo.gitInfo?.local && (
                  <>
                    <DetailItem label="Branch" value={webAppInfo.gitInfo.local.branch} icon="i-ph:git-branch" />
                    <DetailItem label="Commit" value={<span className="font-mono text-xs truncate max-w-[100px] xs:max-w-[150px] sm:max-w-xs">{webAppInfo.gitInfo.local.commitHash}</span>} icon="i-ph:git-commit" />
                    <DetailItem label="Author" value={webAppInfo.gitInfo.local.author} icon="i-ph:user" />
                    <DetailItem label="Commit Time" value={new Date(webAppInfo.gitInfo.local.commitTime).toLocaleString()} icon="i-ph:calendar-check" />
                  </>
                )}
                 {webAppInfo.gitInfo?.github?.currentRepo && (
                    <DetailItem
                        label="Repository"
                        value={`${webAppInfo.gitInfo.github.currentRepo.fullName}${webAppInfo.gitInfo.isForked ? ' (fork)' : ''}`}
                        icon="i-ph:github-logo"
                    />
                 )}
              </div>
            )}
            {webAppInfo && webAppInfo.dependencies && (
              <div className="mt-4 sm:mt-6">
                <h3 className="mb-2 sm:mb-3 md:mb-4 text-sm sm:text-base font-medium text-bolt-elements-textPrimary">Dependencies</h3>
                <div className="bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg divide-y divide-[#E5E5E5] dark:divide-[#1A1A1A]">
                  <DependencySection title="Production" deps={webAppInfo.dependencies.production || []} />
                  <DependencySection title="Development" deps={webAppInfo.dependencies.development || []} />
                  <DependencySection title="Peer" deps={webAppInfo.dependencies.peer || []} />
                  <DependencySection title="Optional" deps={webAppInfo.dependencies.optional || []} />
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={openSections.errors} onOpenChange={(open) => setOpenSections((prev) => ({ ...prev, errors: open }))} className="w-full">
        <CollapsibleTrigger className="w-full">
           <SectionHeader
            icon="i-ph:warning"
            title="Error Log"
            iconContainerClassName="text-red-500 dark:text-red-400"
            className="mb-0 p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A] hover:border-purple-500/30 dark:hover:border-purple-400/40"
            actions={
                <>
                {errorLogs.length > 0 && (
                    <Badge variant="destructive" className="ml-1 sm:ml-2 text-[9px] sm:text-xs px-1 sm:px-1.5">
                    {errorLogs.length} Errors
                    </Badge>
                )}
                <div className={classNames('i-ph:caret-down w-4 h-4 transform transition-transform duration-200', openSections.errors ? 'rotate-180' : '')}/>
                </>
            }
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 sm:p-4 md:p-6 mt-1 sm:mt-2 rounded-lg sm:rounded-xl bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A]">
            <ScrollArea className="h-[200px] sm:h-[250px] md:h-[300px]">
              <div className="space-y-3 sm:space-y-4">
                <div className="text-xs sm:text-sm text-bolt-elements-textSecondary">
                  This log captures:
                  <ul className="list-disc list-inside mt-1.5 sm:mt-2 space-y-1">
                    <li>Unhandled JavaScript errors from `window.onerror`</li>
                    <li>Unhandled Promise rejections from `window.onunhandledrejection`</li>
                    <li>Explicitly logged errors via `logStore.logError()`</li>
                  </ul>
                </div>
                <div className="text-xs sm:text-sm">
                  <span className="text-bolt-elements-textSecondary">Status: </span>
                  <span className="text-bolt-elements-textPrimary">
                    {loading.errors ? 'Checking...' : errorLogs.length > 0 ? `${errorLogs.length} error(s) found` : 'No errors found'}
                  </span>
                </div>
                {errorLogs.length > 0 && (
                  <div className="mt-3 sm:mt-4">
                    <div className="text-xs sm:text-sm font-medium text-bolt-elements-textPrimary mb-1.5 sm:mb-2">Recent Errors:</div>
                    <div className="space-y-1.5 sm:space-y-2">
                      {errorLogs.slice(-10).reverse().map((error) => ( // Show last 10, newest first
                        <div key={error.id} className="text-xs sm:text-sm text-red-600 dark:text-red-400 p-1.5 sm:p-2 rounded-md bg-red-500/10 dark:bg-red-400/10 border border-red-500/20 dark:border-red-400/20">
                          <div className="font-medium">{error.message}</div>
                          {error.source && ( <div className="text-[10px] sm:text-xs mt-0.5 sm:mt-1"> Source: {error.source}{error.details?.lineNumber && `:${error.details.lineNumber}`}</div> )}
                          {error.timestamp && (<div className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 opacity-70">{new Date(error.timestamp).toLocaleString()}</div>)}
                          {error.stack && ( <pre className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 font-mono whitespace-pre-wrap max-h-20 overflow-y-auto scrollbar-thin">{error.stack}</pre> )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
