import { motion } from 'framer-motion';
import React, { Suspense, useState } from 'react';
import { classNames } from '~/utils/classNames';
import ConnectionDiagnostics from './ConnectionDiagnostics';
import { Button } from '~/components/ui/Button';
import VercelConnection from './VercelConnection';
import { SectionHeader } from '~/components/ui/SectionHeader'; // Import SectionHeader

// Use React.lazy for dynamic imports
const GitHubConnection = React.lazy(() => import('./GithubConnection'));
const NetlifyConnection = React.lazy(() => import('./NetlifyConnection'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="p-3 sm:p-4 bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-1 rounded-md sm:rounded-lg border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor">
    <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary">
      <div className="i-ph:spinner-gap w-4 h-4 animate-spin" />
      <span>Loading connection...</span>
    </div>
  </div>
);

export default function ConnectionsTab() {
  const [isEnvVarsExpanded, setIsEnvVarsExpanded] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  return (
    <div className="space-y-4 sm:space-y-6">
      <SectionHeader
        title="Connection Settings"
        description="Manage your external service connections and integrations"
        icon="i-ph:plugs-connected"
        iconContainerClassName="text-bolt-elements-item-contentAccent dark:text-bolt-elements-item-contentAccent" // Match original icon color
        actions={
          <Button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 sm:gap-2 hover:bg-bolt-elements-item-backgroundActive/10 hover:text-bolt-elements-textPrimary dark:hover:bg-bolt-elements-item-backgroundActive/10 dark:hover:text-bolt-elements-textPrimary transition-colors"
          >
            {showDiagnostics ? (
              <>
                <div className="i-ph:eye-slash w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Hide Diagnostics
              </>
            ) : (
              <>
                <div className="i-ph:wrench w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Troubleshoot Connections
              </>
            )}
          </Button>
        }
        className="mt-4 mb-0 sm:mt-6" // Adjusted margins for SectionHeader
      />

      {showDiagnostics && <ConnectionDiagnostics />}

      <motion.div
        className="bg-bolt-elements-background dark:bg-bolt-elements-background rounded-md sm:rounded-lg border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }} // Adjusted delay
      >
        <div className="p-3 sm:p-4 md:p-6">
          {/* Using a button as a header that also toggles, similar to CollapsibleTrigger */}
          <button
            onClick={() => setIsEnvVarsExpanded(!isEnvVarsExpanded)}
            className={classNames(
              'w-full bg-transparent flex items-center justify-between',
              'hover:bg-bolt-elements-item-backgroundActive/10 hover:text-bolt-elements-textPrimary',
              'dark:hover:bg-bolt-elements-item-backgroundActive/10 dark:hover:text-bolt-elements-textPrimary',
              'rounded-md p-1.5 sm:p-2 -m-1.5 sm:-m-2 transition-colors',
            )}
            aria-expanded={isEnvVarsExpanded} // For accessibility
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="i-ph:info w-4 h-4 sm:w-5 sm:h-5 text-bolt-elements-item-contentAccent dark:text-bolt-elements-item-contentAccent" />
              <h3 className="text-sm sm:text-base font-medium text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary">
                Environment Variables
              </h3>
            </div>
            <div
              className={classNames(
                'i-ph:caret-down w-4 h-4 text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary transition-transform',
                isEnvVarsExpanded ? 'rotate-180' : '',
              )}
            />
          </button>

          {isEnvVarsExpanded && (
            <motion.div
              className="mt-2 sm:mt-3 md:mt-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-xs sm:text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary mb-1.5 sm:mb-2">
                You can configure connections using environment variables in your{' '}
                <code className="px-1 py-0.5 bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 rounded text-[10px] sm:text-xs">
                  .env.local
                </code>{' '}
                file:
              </p>
              <div className="bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 p-2 sm:p-3 rounded sm:rounded-md text-[10px] sm:text-xs font-mono overflow-x-auto">
                <div className="text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary">
                  # GitHub Authentication
                </div>
                <div className="text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary">
                  VITE_GITHUB_ACCESS_TOKEN=your_token_here
                </div>
                <div className="text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary">
                  # Optional: Specify token type (defaults to 'classic' if not specified)
                </div>
                <div className="text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary">
                  VITE_GITHUB_TOKEN_TYPE=classic|fine-grained
                </div>
                <div className="text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary mt-1.5 sm:mt-2">
                  # Netlify Authentication
                </div>
                <div className="text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary">
                  VITE_NETLIFY_ACCESS_TOKEN=your_token_here
                </div>
              </div>
              <div className="mt-2 sm:mt-3 text-[10px] sm:text-xs text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary space-y-0.5 sm:space-y-1">
                <p>
                  <span className="font-medium">Token types:</span>
                </p>
                <ul className="list-disc list-inside pl-1.5 sm:pl-2 space-y-0.5 sm:space-y-1">
                  <li>
                    <span className="font-medium">classic</span> - Personal Access Token with{' '}
                    <code className="px-1 py-0.5 bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 rounded">
                      repo, read:org, read:user
                    </code>{' '}
                    scopes
                  </li>
                  <li>
                    <span className="font-medium">fine-grained</span> - Fine-grained token with Repository and
                    Organization access
                  </li>
                </ul>
                <p className="mt-1.5 sm:mt-2">
                  When set, these variables will be used automatically without requiring manual connection.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        <Suspense fallback={<LoadingFallback />}>
          <GitHubConnection />
        </Suspense>
        <Suspense fallback={<LoadingFallback />}>
          <NetlifyConnection />
        </Suspense>
        <Suspense fallback={<LoadingFallback />}>
          <VercelConnection />
        </Suspense>
      </div>

      <div className="text-xs sm:text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 p-3 sm:p-4 rounded-md sm:rounded-lg">
        <p className="flex items-center gap-1 sm:gap-1.5 mb-1.5 sm:mb-2">
          <span className="i-ph:lightbulb w-4 h-4 text-bolt-elements-icon-success dark:text-bolt-elements-icon-success" />
          <span className="font-medium">Troubleshooting Tip:</span>
        </p>
        <p className="mb-1.5 sm:mb-2">
          If you're having trouble with connections, try using the troubleshooting tool at the top of this page. It can
          help diagnose and fix common connection issues.
        </p>
        <p>For persistent issues:</p>
        <ol className="list-decimal list-inside pl-3 sm:pl-4 mt-1">
          <li>Check your browser console for errors</li>
          <li>Verify that your tokens have the correct permissions</li>
          <li>Try clearing your browser cache and cookies</li>
          <li>Ensure your browser allows third-party cookies if using integrations</li>
        </ol>
      </div>
    </div>
  );
}
