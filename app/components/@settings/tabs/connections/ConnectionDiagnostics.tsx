import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Button } from '~/components/ui/Button';
import { Badge } from '~/components/ui/Badge';
import { classNames } from '~/utils/classNames';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '~/components/ui/Collapsible';
import { CodeBracketIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { ServiceConnectionCard } from './ServiceConnectionCard'; // Import the new card

// Helper function to safely parse JSON
const safeJsonParse = (item: string | null) => {
  if (!item) return null;
  try {
    return JSON.parse(item);
  } catch (e) {
    console.error('Failed to parse JSON from localStorage:', e);
    return null;
  }
};

export default function ConnectionDiagnostics() {
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const runDiagnostics = async () => {
    try {
      setIsRunning(true);
      setDiagnosticResults(null);

      const localStorageChecks = {
        githubConnection: localStorage.getItem('github_connection'),
        netlifyConnection: localStorage.getItem('netlify_connection'),
        vercelConnection: localStorage.getItem('vercel_connection'),
        supabaseConnection: localStorage.getItem('supabase_connection'),
      };

      const response = await fetch('/api/system/diagnostics');
      if (!response.ok) throw new Error(`Diagnostics API error: ${response.status}`);
      const serverDiagnostics = await response.json();

      const githubConnectionParsed = safeJsonParse(localStorageChecks.githubConnection);
      const githubToken = githubConnectionParsed?.token;
      const githubAuthHeaders = {
        ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
        'Content-Type': 'application/json',
      };

      const githubEndpoints = [
        { name: 'User', url: '/api/system/git-info?action=getUser' },
        { name: 'Repos', url: '/api/system/git-info?action=getRepos' },
        { name: 'Default', url: '/api/system/git-info' },
      ];
      const githubResults = await Promise.all(
        githubEndpoints.map(async (endpoint) => {
          try {
            const resp = await fetch(endpoint.url, { headers: githubAuthHeaders });
            return { endpoint: endpoint.name, status: resp.status, ok: resp.ok };
          } catch (error) {
            return { endpoint: endpoint.name, error: error instanceof Error ? error.message : String(error), ok: false };
          }
        }),
      );

      const netlifyConnectionParsed = safeJsonParse(localStorageChecks.netlifyConnection);
      const netlifyToken = netlifyConnectionParsed?.token;
      let netlifyUserCheck = null;
      if (netlifyToken) {
        try {
          const netlifyResp = await fetch('https://api.netlify.com/api/v1/user', { headers: { Authorization: `Bearer ${netlifyToken}` } });
          netlifyUserCheck = { status: netlifyResp.status, ok: netlifyResp.ok };
        } catch (error) {
          netlifyUserCheck = { error: error instanceof Error ? error.message : String(error), ok: false };
        }
      }

      const vercelConnectionParsed = safeJsonParse(localStorageChecks.vercelConnection);
      const vercelToken = vercelConnectionParsed?.token;
      let vercelUserCheck = null;
      if (vercelToken) {
        try {
          const vercelResp = await fetch('https://api.vercel.com/v2/user', { headers: { Authorization: `Bearer ${vercelToken}` } });
          vercelUserCheck = { status: vercelResp.status, ok: vercelResp.ok };
        } catch (error) {
          vercelUserCheck = { error: error instanceof Error ? error.message : String(error), ok: false };
        }
      }

      const supabaseConnectionParsed = safeJsonParse(localStorageChecks.supabaseConnection);
      const supabaseUrl = supabaseConnectionParsed?.projectUrl;
      const supabaseAnonKey = supabaseConnectionParsed?.anonKey;
      let supabaseCheck = null;
      if (supabaseUrl && supabaseAnonKey) {
        supabaseCheck = { ok: true, status: 200, message: 'URL and Key present in localStorage' };
      } else {
        supabaseCheck = { ok: false, message: 'URL or Key missing in localStorage' };
      }

      const results = {
        timestamp: new Date().toISOString(),
        localStorage: {
          hasGithubConnection: Boolean(localStorageChecks.githubConnection),
          hasNetlifyConnection: Boolean(localStorageChecks.netlifyConnection),
          hasVercelConnection: Boolean(localStorageChecks.vercelConnection),
          hasSupabaseConnection: Boolean(localStorageChecks.supabaseConnection),
          githubConnectionParsed, netlifyConnectionParsed, vercelConnectionParsed, supabaseConnectionParsed,
        },
        apiEndpoints: { github: githubResults, netlify: netlifyUserCheck, vercel: vercelUserCheck, supabase: supabaseCheck },
        serverDiagnostics,
      };
      setDiagnosticResults(results);

      if (results.localStorage.hasGithubConnection && results.apiEndpoints.github.some((r: { ok: boolean }) => !r.ok)) toast.error('GitHub API connections are failing. Try reconnecting.');
      if (results.localStorage.hasNetlifyConnection && netlifyUserCheck && !netlifyUserCheck.ok) toast.error('Netlify API connection is failing. Try reconnecting.');
      if (results.localStorage.hasVercelConnection && vercelUserCheck && !vercelUserCheck.ok) toast.error('Vercel API connection is failing. Try reconnecting.');
      if (results.localStorage.hasSupabaseConnection && supabaseCheck && !supabaseCheck.ok) toast.warning('Supabase connection check failed or missing details. Verify settings.');
      if (!results.localStorage.hasGithubConnection && !results.localStorage.hasNetlifyConnection && !results.localStorage.hasVercelConnection && !results.localStorage.hasSupabaseConnection) toast.info('No connection data found in browser storage.');

    } catch (error) {
      console.error('Diagnostics error:', error);
      toast.error('Error running diagnostics');
      setDiagnosticResults({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsRunning(false);
    }
  };

  const resetGitHubConnection = () => {
    try {
      localStorage.removeItem('github_connection');
      document.cookie = 'githubToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'githubUsername=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'git:github.com=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      toast.success('GitHub connection data cleared. Please refresh the page and reconnect.');
      setDiagnosticResults(null);
    } catch (error) { toast.error('Failed to clear GitHub connection data'); }
  };
  const resetNetlifyConnection = () => {
    try {
      localStorage.removeItem('netlify_connection');
      document.cookie = 'netlifyToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      toast.success('Netlify connection data cleared. Please refresh the page and reconnect.');
      setDiagnosticResults(null);
    } catch (error) { toast.error('Failed to clear Netlify connection data'); }
  };
  const resetVercelConnection = () => {
    try {
      localStorage.removeItem('vercel_connection');
      toast.success('Vercel connection data cleared. Please refresh the page and reconnect.');
      setDiagnosticResults(null);
    } catch (error) { toast.error('Failed to clear Vercel connection data'); }
  };
  const resetSupabaseConnection = () => {
    try {
      localStorage.removeItem('supabase_connection');
      toast.success('Supabase connection data cleared. Please refresh the page and reconnect.');
      setDiagnosticResults(null);
    } catch (error) { toast.error('Failed to clear Supabase connection data'); }
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6"> {/* Responsive gap */}
      {/* Connection Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4"> {/* Responsive gap */}
        <ServiceConnectionCard
          serviceName="GitHub Connection"
          serviceIcon="i-ph:github-logo"
          isConnected={diagnosticResults?.localStorage.hasGithubConnection ?? false}
          userInfo={diagnosticResults?.localStorage.githubConnectionParsed?.user?.login}
          apiOk={diagnosticResults?.apiEndpoints.github.every((r: { ok: boolean }) => r.ok)}
          onConnectClick={() => window.location.reload()} // Assuming connect is a page reload/redirect
          onResetClick={resetGitHubConnection}
          isActionDisabled={isRunning}
          isLoading={!diagnosticResults && isRunning}
        />
        <ServiceConnectionCard
          serviceName="Netlify Connection"
          serviceIcon="i-bolt:netlify" // Using custom icon class if available
          isConnected={diagnosticResults?.localStorage.hasNetlifyConnection ?? false}
          userInfo={diagnosticResults?.localStorage.netlifyConnectionParsed?.user?.full_name || diagnosticResults?.localStorage.netlifyConnectionParsed?.user?.email}
          apiOk={diagnosticResults?.apiEndpoints.netlify?.ok}
          onConnectClick={() => window.location.reload()}
          onResetClick={resetNetlifyConnection}
          isActionDisabled={isRunning}
          isLoading={!diagnosticResults && isRunning}
        />
        <ServiceConnectionCard
          serviceName="Vercel Connection"
          serviceIcon="i-si:vercel" // Using iconify class
          isConnected={diagnosticResults?.localStorage.hasVercelConnection ?? false}
          userInfo={diagnosticResults?.localStorage.vercelConnectionParsed?.user?.username || diagnosticResults?.localStorage.vercelConnectionParsed?.user?.user?.username}
          apiOk={diagnosticResults?.apiEndpoints.vercel?.ok}
          onConnectClick={() => window.location.reload()}
          onResetClick={resetVercelConnection}
          isActionDisabled={isRunning}
          isLoading={!diagnosticResults && isRunning}
        />
        <ServiceConnectionCard
          serviceName="Supabase Connection"
          serviceIcon="i-si:supabase" // Using iconify class
          isConnected={diagnosticResults?.localStorage.hasSupabaseConnection ?? false}
          userInfo={diagnosticResults?.localStorage.supabaseConnectionParsed?.projectUrl ? 'Project URL Configured' : null}
          apiOk={diagnosticResults?.apiEndpoints.supabase?.ok}
          customStatusMessage={!diagnosticResults?.localStorage.hasSupabaseConnection ? 'Configure in Settings > Local Providers' : diagnosticResults?.apiEndpoints.supabase?.ok ? undefined : diagnosticResults?.apiEndpoints.supabase?.message}
          onConnectClick={() => window.location.reload()} // Or navigate to relevant settings page
          onResetClick={resetSupabaseConnection}
          isActionDisabled={isRunning}
          isLoading={!diagnosticResults && isRunning}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4"> {/* Responsive gap */}
        <Button
          onClick={runDiagnostics}
          disabled={isRunning}
          variant="outline"
          size="sm" // Responsive via Button definition
          className="flex items-center gap-1.5 sm:gap-2 hover:bg-bolt-elements-item-backgroundActive/10 hover:text-bolt-elements-textPrimary dark:hover:bg-bolt-elements-item-backgroundActive/10 dark:hover:text-bolt-elements-textPrimary transition-colors"
        >
          {isRunning ? (
            <div className="i-ph:spinner-gap w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
          ) : (
            <div className="i-ph:activity w-3.5 h-3.5 sm:w-4 sm:h-4" />
          )}
          {isRunning ? 'Running Diagnostics...' : 'Run Diagnostics'}
        </Button>
      </div>

      {/* Details Panel */}
      {diagnosticResults && (
        <div className="mt-2 sm:mt-4"> {/* Responsive margin */}
          <Collapsible open={showDetails} onOpenChange={setShowDetails} className="w-full">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl bg-bolt-elements-background dark:bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor hover:border-bolt-elements-borderColorActive/70 dark:hover:border-bolt-elements-borderColorActive/70 transition-all duration-200"> {/* Responsive padding & rounding */}
                <div className="flex items-center gap-1.5 sm:gap-2"> {/* Responsive gap */}
                  <CodeBracketIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" /> {/* Responsive icon */}
                  <span className="text-xs sm:text-sm font-medium text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary"> {/* Responsive text */}
                    Diagnostic Details
                  </span>
                </div>
                <ChevronDownIcon
                  className={classNames(
                    'w-3.5 h-3.5 sm:w-4 sm:h-4 transform transition-transform duration-200 text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary', // Responsive icon
                    showDetails ? 'rotate-180' : '',
                  )}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden">
              <div className="p-3 sm:p-4 mt-1 sm:mt-2 rounded-lg sm:rounded-xl bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor"> {/* Responsive padding, margin, rounding */}
                <pre className="text-[10px] sm:text-xs overflow-auto max-h-80 sm:max-h-96 text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary"> {/* Responsive text & max-height */}
                  {JSON.stringify(diagnosticResults, null, 2)}
                </pre>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
