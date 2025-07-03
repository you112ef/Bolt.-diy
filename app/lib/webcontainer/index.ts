import { WebContainer } from '@webcontainer/api';
import { WORK_DIR_NAME } from '~/utils/constants';
import { cleanStackTrace } from '~/utils/stacktrace';

interface WebContainerContext {
  loaded: boolean;
}

// Provide a fallback for import.meta.hot in test environments
const hotData = typeof import.meta.hot?.data === 'object' ? import.meta.hot.data : {};

export const webcontainerContext: WebContainerContext = hotData.webcontainerContext ?? {
  loaded: false,
};

if (typeof import.meta.hot?.data === 'object') {
  import.meta.hot.data.webcontainerContext = webcontainerContext;
}

export let webcontainer: Promise<WebContainer> = new Promise(() => {
  // noop for ssr
});

if (!import.meta.env.SSR) {
  webcontainer =
    hotData.webcontainer ?? // Use the checked hotData
    Promise.resolve()
      .then(() => {
        return WebContainer.boot({
          coep: 'credentialless',
          workdirName: WORK_DIR_NAME,
          forwardPreviewErrors: true, // Enable error forwarding from iframes
        });
      })
      .then(async (webcontainerInstance) => { // Renamed to avoid conflict with outer webcontainer
        webcontainerContext.loaded = true;

        const { workbenchStore } = await import('~/lib/stores/workbench');

        // Listen for preview errors
        webcontainerInstance.on('preview-message', (message) => {
          console.log('WebContainer preview message:', message);

          // Handle both uncaught exceptions and unhandled promise rejections
          if (message.type === 'PREVIEW_UNCAUGHT_EXCEPTION' || message.type === 'PREVIEW_UNHANDLED_REJECTION') {
            const isPromise = message.type === 'PREVIEW_UNHANDLED_REJECTION';
            const title = isPromise ? 'Unhandled Promise Rejection' : 'Uncaught Exception';
            workbenchStore.actionAlert.set({
              type: 'preview',
              title,
              description: 'message' in message ? message.message : 'Unknown error',
              content: `Error occurred at ${message.pathname}${message.search}${message.hash}\nPort: ${message.port}\n\nStack trace:\n${cleanStackTrace(message.stack || '')}`,
              source: 'preview',
            });
          }
        });

        return webcontainerInstance;
      });

  // Ensure import.meta.hot and import.meta.hot.data exist before assigning to it
  if (typeof import.meta.hot?.data === 'object') {
    import.meta.hot.data.webcontainer = webcontainer;
  }
}
