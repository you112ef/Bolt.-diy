import { motion } from 'framer-motion';
import React, { Suspense, useState } from 'react';
import { classNames } from '~/utils/classNames';
import ConnectionDiagnostics from './ConnectionDiagnostics';
import { Button } from '~/components/ui/Button';
import VercelConnection from './VercelConnection';

// Use React.lazy for dynamic imports
const GitHubConnection = React.lazy(() => import('./GithubConnection'));
const NetlifyConnection = React.lazy(() => import('./NetlifyConnection'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="p-3 sm:p-4 bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-1 rounded-md sm:rounded-lg border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor"> {/* Responsive padding and rounding */}
    <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary"> {/* Responsive gap and text */}
      <div className="i-ph:spinner-gap w-4 h-4 animate-spin" /> {/* Icon size fine */}
      <span>Loading connection...</span>
    </div>
  </div>
);

export default function ConnectionsTab() {
  const [isEnvVarsExpanded, setIsEnvVarsExpanded] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  return (
    <div className="space-y-4 sm:space-y-6"> {/* Responsive space */}
      {/* Header */}
      <motion.div
        className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between" // Responsive flex and gap
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-1.5 sm:gap-2"> {/* Responsive gap */}
          <div className="i-ph:plugs-connected w-4 h-4 sm:w-5 sm:h-5 text-bolt-elements-item-contentAccent dark:text-bolt-elements-item-contentAccent" /> {/* Responsive icon */}
          <h2 className="text-base sm:text-lg font-medium text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary"> {/* Responsive text */}
            Connection Settings
          </h2>
        </div>
        <Button
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          variant="outline"
          size="sm" // Button is responsive via its own variants
          className="flex items-center gap-1.5 sm:gap-2 hover:bg-bolt-elements-item-backgroundActive/10 hover:text-bolt-elements-textPrimary dark:hover:bg-bolt-elements-item-backgroundActive/10 dark:hover:text-bolt-elements-textPrimary transition-colors" // Responsive gap
        >
          {showDiagnostics ? (
            <>
              <div className="i-ph:eye-slash w-3.5 h-3.5 sm:w-4 sm:h-4" /> {/* Responsive icon */}
              Hide Diagnostics
            </>
          ) : (
            <>
              <div className="i-ph:wrench w-3.5 h-3.5 sm:w-4 sm:h-4" /> {/* Responsive icon */}
              Troubleshoot Connections
            </>
          )}
        </Button>
      </motion.div>
      <p className="text-xs sm:text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary"> {/* Responsive text */}
        Manage your external service connections and integrations
      </p>

      {/* Diagnostics Tool - Conditionally rendered */}
      {showDiagnostics && <ConnectionDiagnostics />} {/* This component will need its own responsive review */}

      {/* Environment Variables Info - Collapsible */}
      <motion.div
        className="bg-bolt-elements-background dark:bg-bolt-elements-background rounded-md sm:rounded-lg border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor" // Responsive rounding
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="p-3 sm:p-4 md:p-6"> {/* Responsive padding */}
          <button
            onClick={() => setIsEnvVarsExpanded(!isEnvVarsExpanded)}
            className={classNames(
              'w-full bg-transparent flex items-center justify-between',
              'hover:bg-bolt-elements-item-backgroundActive/10 hover:text-bolt-elements-textPrimary',
              'dark:hover:bg-bolt-elements-item-backgroundActive/10 dark:hover:text-bolt-elements-textPrimary',
              'rounded-md p-1.5 sm:p-2 -m-1.5 sm:-m-2 transition-colors', // Responsive padding and negative margin
            )}
          >
            <div className="flex items-center gap-1.5 sm:gap-2"> {/* Responsive gap */}
              <div className="i-ph:info w-4 h-4 sm:w-5 sm:h-5 text-bolt-elements-item-contentAccent dark:text-bolt-elements-item-contentAccent" /> {/* Responsive icon */}
              <h3 className="text-sm sm:text-base font-medium text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary"> {/* Responsive text */}
                Environment Variables
              </h3>
            </div>
            <div
              className={classNames(
                'i-ph:caret-down w-4 h-4 text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary transition-transform', // Caret size fine
                isEnvVarsExpanded ? 'rotate-180' : '',
              )}
            />
          </button>

          {isEnvVarsExpanded && (
            <div className="mt-2 sm:mt-3 md:mt-4"> {/* Responsive margin */}
              <p className="text-xs sm:text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary mb-1.5 sm:mb-2"> {/* Responsive text & margin */}
                You can configure connections using environment variables in your{' '}
                <code className="px-1 py-0.5 bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 rounded text-[10px] sm:text-xs"> {/* Responsive code text */}
                  .env.local
                </code>{' '}
                file:
              </p>
              <div className="bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 p-2 sm:p-3 rounded sm:rounded-md text-[10px] sm:text-xs font-mono overflow-x-auto"> {/* Responsive padding, rounding, text */}
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
                <div className="text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary mt-1.5 sm:mt-2"> {/* Responsive margin */}
                  # Netlify Authentication
                </div>
                <div className="text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary">
                  VITE_NETLIFY_ACCESS_TOKEN=your_token_here
                </div>
              </div>
              <div className="mt-2 sm:mt-3 text-[10px] sm:text-xs text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary space-y-0.5 sm:space-y-1"> {/* Responsive margin, text, space */}
                <p>
                  <span className="font-medium">Token types:</span>
                </p>
                <ul className="list-disc list-inside pl-1.5 sm:pl-2 space-y-0.5 sm:space-y-1"> {/* Responsive padding and space */}
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
                <p className="mt-1.5 sm:mt-2"> {/* Responsive margin */}
                  When set, these variables will be used automatically without requiring manual connection.
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6"> {/* Responsive gap */}
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

      {/* Additional help text */}
      <div className="text-xs sm:text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 p-3 sm:p-4 rounded-md sm:rounded-lg"> {/* Responsive text, padding, rounding */}
        <p className="flex items-center gap-1 sm:gap-1.5 mb-1.5 sm:mb-2"> {/* Responsive gap & margin */}
          <span className="i-ph:lightbulb w-4 h-4 text-bolt-elements-icon-success dark:text-bolt-elements-icon-success" /> {/* Icon size fine */}
          <span className="font-medium">Troubleshooting Tip:</span>
        </p>
        <p className="mb-1.5 sm:mb-2"> {/* Responsive margin */}
          If you're having trouble with connections, try using the troubleshooting tool at the top of this page. It can
          help diagnose and fix common connection issues.
        </p>
        <p>For persistent issues:</p>
        <ol className="list-decimal list-inside pl-3 sm:pl-4 mt-1"> {/* Responsive padding & margin */}
          <li>Check your browser console for errors</li>
          <li>Verify that your tokens have the correct permissions</li>
          <li>Try clearing your browser cache and cookies</li>
          <li>Ensure your browser allows third-party cookies if using integrations</li>
        </ol>
      </div>
    </div>
  );
}
