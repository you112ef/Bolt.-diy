import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { logStore } from '~/lib/stores/logs';
import { classNames } from '~/utils/classNames';
import Cookies from 'js-cookie';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '~/components/ui/Collapsible';
import { Button } from '~/components/ui/Button';
import { SectionHeader } from '~/components/ui/SectionHeader'; // Import SectionHeader
import { DetailItem } from '~/components/ui/DetailItem'; // Import DetailItem

interface GitHubUserResponse {
  login: string;
  avatar_url: string;
  html_url: string;
  name: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  public_gists: number;
}

interface GitHubRepoInfo {
  name: string;
  full_name: string;
  html_url: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  default_branch: string;
  updated_at: string;
  languages_url: string;
}

interface GitHubOrganization {
  login: string;
  avatar_url: string;
  html_url: string;
}

interface GitHubEvent {
  id: string;
  type: string;
  repo: {
    name: string;
  };
  created_at: string;
}

interface GitHubLanguageStats {
  [language: string]: number;
}

interface GitHubStats {
  repos: GitHubRepoInfo[];
  recentActivity: GitHubEvent[];
  languages: GitHubLanguageStats;
  totalGists: number;
  publicRepos: number;
  privateRepos: number;
  stars: number;
  forks: number;
  followers: number;
  publicGists: number;
  privateGists: number;
  lastUpdated: string;
  totalStars?: number;
  totalForks?: number;
  organizations?: GitHubOrganization[];
}

interface GitHubConnection {
  user: GitHubUserResponse | null;
  token: string;
  tokenType: 'classic' | 'fine-grained';
  stats?: GitHubStats;
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

const GithubLogo = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5"> {/* Responsive icon */}
    <path
      fill="currentColor"
      d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
    />
  </svg>
);

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-3 sm:p-4"> {/* Responsive padding */}
      <div className="flex items-center gap-1.5 sm:gap-2"> {/* Responsive gap */}
        <div className="i-ph:spinner-gap-bold animate-spin w-4 h-4" />
        <span className="text-xs sm:text-sm text-bolt-elements-textSecondary">Loading...</span> {/* Responsive text */}
      </div>
    </div>
  );
}

export default function GitHubConnection() {
  const [connection, setConnection] = useState<GitHubConnection>({
    user: null,
    token: '',
    tokenType: 'classic',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetchingStats, setIsFetchingStats] = useState(false);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const tokenTypeRef = React.useRef<'classic' | 'fine-grained'>('classic');

  const fetchGithubUser = async (token: string) => {
    try {
      const response = await fetch(`/api/system/git-info?action=getUser`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const rateLimit = {
        limit: parseInt(response.headers.get('x-ratelimit-limit') || '0'),
        remaining: parseInt(response.headers.get('x-ratelimit-remaining') || '0'),
        reset: parseInt(response.headers.get('x-ratelimit-reset') || '0'),
      };
      const data = await response.json();
      const { user } = data as { user: GitHubUserResponse };
      if (!user || !user.login) throw new Error('Invalid user data received');

      setConnection((prev) => ({ ...prev, user, token, tokenType: tokenTypeRef.current, rateLimit }));
      Cookies.set('githubUsername', user.login);
      Cookies.set('githubToken', token);
      Cookies.set('git:github.com', JSON.stringify({ username: token, password: 'x-oauth-basic' }));
      localStorage.setItem('github_connection', JSON.stringify({ user, token, tokenType: tokenTypeRef.current }));
      logStore.logInfo('Connected to GitHub', { type: 'system', message: `Connected to GitHub as ${user.login}` });
      fetchGitHubStats(token); // Fetch stats after successful connection
    } catch (error) {
      logStore.logError(`GitHub authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { type: 'system', message: 'GitHub authentication failed' });
      toast.error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  const fetchGitHubStats = async (token: string) => {
    setIsFetchingStats(true);
    try {
      const userResponse = await fetch('https://api.github.com/user', { headers: { Authorization: `${connection.tokenType === 'classic' ? 'token' : 'Bearer'} ${token}` } });
      if (!userResponse.ok) {
        if (userResponse.status === 401) { toast.error('Your GitHub token has expired. Please reconnect your account.'); handleDisconnect(); return; }
        throw new Error(`Failed to fetch user data: ${userResponse.statusText}`);
      }
      const userData = (await userResponse.json()) as any;

      let allRepos: any[] = []; let page = 1; let hasMore = true;
      while (hasMore) {
        const reposResponse = await fetch(`https://api.github.com/user/repos?per_page=100&page=${page}`, { headers: { Authorization: `${connection.tokenType === 'classic' ? 'token' : 'Bearer'} ${token}` } });
        if (!reposResponse.ok) throw new Error(`Failed to fetch repositories: ${reposResponse.statusText}`);
        const repos = (await reposResponse.json()) as any[];
        allRepos = [...allRepos, ...repos];
        const linkHeader = reposResponse.headers.get('Link');
        hasMore = linkHeader?.includes('rel="next"') ?? false;
        page++;
      }

      const repoStats = calculateRepoStats(allRepos);
      const eventsResponse = await fetch(`https://api.github.com/users/${userData.login}/events?per_page=10`, { headers: { Authorization: `${connection.tokenType === 'classic' ? 'token' : 'Bearer'} ${token}` } });
      if (!eventsResponse.ok) throw new Error(`Failed to fetch events: ${eventsResponse.statusText}`);
      const events = (await eventsResponse.json()) as any[];
      const recentActivity = events.slice(0, 5).map((event: any) => ({ id: event.id, type: event.type, repo: event.repo.name, created_at: event.created_at }));
      const totalStars = allRepos.reduce((sum: number, repo: any) => sum + repo.stargazers_count, 0);
      const totalForks = allRepos.reduce((sum: number, repo: any) => sum + repo.forks_count, 0);
      const privateRepos = allRepos.filter((repo: any) => repo.private).length;

      const stats: GitHubStats = {
        repos: repoStats.repos, recentActivity, languages: repoStats.languages || {},
        totalGists: repoStats.totalGists || 0, publicRepos: userData.public_repos || 0,
        privateRepos: privateRepos || 0, stars: totalStars || 0, forks: totalForks || 0,
        followers: userData.followers || 0, publicGists: userData.public_gists || 0,
        privateGists: userData.private_gists || 0, lastUpdated: new Date().toISOString(),
        totalStars: totalStars || 0, totalForks: totalForks || 0, organizations: [],
      };
      const currentConnection = JSON.parse(localStorage.getItem('github_connection') || '{}');
      const currentUser = currentConnection.user || connection.user;
      const updatedConnection: GitHubConnection = { user: currentUser, token, tokenType: connection.tokenType, stats, rateLimit: connection.rateLimit };
      localStorage.setItem('github_connection', JSON.stringify(updatedConnection));
      setConnection(updatedConnection);
      toast.success('GitHub stats refreshed');
    } catch (error) {
      toast.error(`Failed to fetch GitHub stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsFetchingStats(false);
    }
  };

  const calculateRepoStats = (repos: any[]) => {
    const repoStats = {
      repos: repos.map((repo: any) => ({
        name: repo.name, full_name: repo.full_name, html_url: repo.html_url, description: repo.description,
        stargazers_count: repo.stargazers_count, forks_count: repo.forks_count, default_branch: repo.default_branch,
        updated_at: repo.updated_at, languages_url: repo.languages_url,
      })),
      languages: {} as Record<string, number>, totalGists: 0,
    };
    repos.forEach((repo: any) => {
      fetch(repo.languages_url).then((response) => response.json()).then((languages: any) => {
        const typedLanguages = languages as Record<string, number>;
        Object.keys(typedLanguages).forEach((language) => {
          if (!repoStats.languages[language]) repoStats.languages[language] = 0;
          repoStats.languages[language] += 1;
        });
      });
    });
    return repoStats;
  };

  useEffect(() => {
    const loadSavedConnection = async () => {
      setIsLoading(true);
      const savedConnection = localStorage.getItem('github_connection');
      if (savedConnection) {
        try {
          const parsed = JSON.parse(savedConnection);
          if (!parsed.tokenType) parsed.tokenType = 'classic';
          tokenTypeRef.current = parsed.tokenType;
          setConnection(parsed);
          if (parsed.user && parsed.token && (!parsed.stats || !parsed.stats.repos || parsed.stats.repos.length === 0)) {
            await fetchGitHubStats(parsed.token);
          }
        } catch (error) { localStorage.removeItem('github_connection'); }
      } else {
        const envToken = import.meta.env.VITE_GITHUB_ACCESS_TOKEN;
        if (envToken) {
          const envTokenType = import.meta.env.VITE_GITHUB_TOKEN_TYPE;
          const tokenType = envTokenType === 'classic' || envTokenType === 'fine-grained' ? (envTokenType as 'classic' | 'fine-grained') : 'classic';
          tokenTypeRef.current = tokenType;
          setConnection((prev) => ({ ...prev, tokenType }));
          try { await fetchGithubUser(envToken); }
          catch (error) { console.error('Failed to connect with environment token:', error); }
        }
      }
      setIsLoading(false);
    };
    loadSavedConnection();
  }, []);

  useEffect(() => {
    if (!connection) return;
    const token = connection.token; const data = connection.user;
    if (token) { Cookies.set('githubToken', token); Cookies.set('git:github.com', JSON.stringify({ username: token, password: 'x-oauth-basic' })); }
    if (data) { Cookies.set('githubUsername', data.login); }
  }, [connection]);

  const updateRateLimits = async (token: string) => {
    try {
      const response = await fetch('https://api.github.com/rate_limit', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' } });
      if (response.ok) {
        const rateLimit = {
          limit: parseInt(response.headers.get('x-ratelimit-limit') || '0'),
          remaining: parseInt(response.headers.get('x-ratelimit-remaining') || '0'),
          reset: parseInt(response.headers.get('x-ratelimit-reset') || '0'),
        };
        setConnection((prev) => ({ ...prev, rateLimit }));
      }
    } catch (error) { console.error('Failed to fetch rate limits:', error); }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (connection.token && connection.user) {
      updateRateLimits(connection.token);
      interval = setInterval(() => updateRateLimits(connection.token), 60000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [connection.token, connection.user]);

  if (isLoading) return <LoadingSpinner />; // isConnecting and isFetchingStats are handled by button states

  const handleConnect = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsConnecting(true);
    try {
      tokenTypeRef.current = connection.tokenType;
      localStorage.setItem('github_connection', JSON.stringify({ user: null, token: connection.token, tokenType: connection.tokenType }));
      await fetchGithubUser(connection.token);
      toast.success('Connected to GitHub successfully');
    } catch (error) {
      setConnection({ user: null, token: connection.token, tokenType: connection.tokenType });
      toast.error(`Failed to connect to GitHub: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('github_connection');
    Cookies.remove('githubToken'); Cookies.remove('githubUsername'); Cookies.remove('git:github.com');
    tokenTypeRef.current = 'classic';
    setConnection({ user: null, token: '', tokenType: 'classic' });
    toast.success('Disconnected from GitHub');
  };

  const headerActions = connection.user ? (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
        <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://github.com/dashboard', '_blank', 'noopener,noreferrer')}
            className="flex items-center gap-1.5 sm:gap-2"
        >
            <div className="i-ph:layout w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Dashboard
        </Button>
        <Button
            onClick={() => { fetchGitHubStats(connection.token); updateRateLimits(connection.token); }}
            disabled={isFetchingStats}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 sm:gap-2"
        >
            {isFetchingStats ? (
                <><div className="i-ph:spinner-gap w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />Refreshing...</>
            ) : (
                <><div className="i-ph:arrows-clockwise w-3.5 h-3.5 sm:w-4 sm:h-4" />Refresh Stats</>
            )}
        </Button>
    </div>
  ) : undefined;


  return (
    <motion.div
      className="bg-bolt-elements-background dark:bg-bolt-elements-background border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor rounded-md sm:rounded-lg" // Responsive rounding
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }} // Adjusted delay
    >
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6"> {/* Responsive padding and space */}
        <SectionHeader
          icon={<GithubLogo />}
          title="GitHub Connection"
          actions={headerActions}
          className="pb-3 sm:pb-4 border-b border-bolt-elements-borderColor" // Add border and padding to SectionHeader
        />

        {!connection.user && (
          <div className="text-[10px] sm:text-xs text-bolt-elements-textSecondary bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-1 p-2 sm:p-3 rounded-md sm:rounded-lg mb-3 sm:mb-4"> {/* Responsive text, padding, rounding, margin */}
            <p className="flex items-center gap-1 mb-1">
              <span className="i-ph:lightbulb w-3.5 h-3.5 text-bolt-elements-icon-success dark:text-bolt-elements-icon-success" />
              <span className="font-medium">Tip:</span> You can also set the{' '}
              <code className="px-1 py-0.5 bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 rounded">
                VITE_GITHUB_ACCESS_TOKEN
              </code>{' '}
              environment variable to connect automatically.
            </p>
            <p>
              For fine-grained tokens, also set{' '}
              <code className="px-1 py-0.5 bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 rounded">
                VITE_GITHUB_TOKEN_TYPE=fine-grained
              </code>
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4"> {/* Responsive gap */}
          <div>
            <label className="block text-xs sm:text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary mb-1.5 sm:mb-2"> {/* Responsive text & margin */}
              Token Type
            </label>
            <select
              value={connection.tokenType}
              onChange={(e) => {
                const newTokenType = e.target.value as 'classic' | 'fine-grained';
                tokenTypeRef.current = newTokenType;
                setConnection((prev) => ({ ...prev, tokenType: newTokenType }));
              }}
              disabled={isConnecting || !!connection.user}
              className={classNames(
                'w-full px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm', // Responsive padding, rounding, text
                'bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-1',
                'border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor',
                'text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary',
                'focus:outline-none focus:ring-1 focus:ring-bolt-elements-item-contentAccent dark:focus:ring-bolt-elements-item-contentAccent',
                'disabled:opacity-50',
              )}
            >
              <option value="classic">Personal Access Token (Classic)</option>
              <option value="fine-grained">Fine-grained Token</option>
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary mb-1.5 sm:mb-2"> {/* Responsive text & margin */}
              {connection.tokenType === 'classic' ? 'Personal Access Token' : 'Fine-grained Token'}
            </label>
            <input
              type="password"
              value={connection.token}
              onChange={(e) => setConnection((prev) => ({ ...prev, token: e.target.value }))}
              disabled={isConnecting || !!connection.user}
              placeholder={`Enter your GitHub ${
                connection.tokenType === 'classic' ? 'personal access token' : 'fine-grained token'
              }`}
              className={classNames(
                'w-full px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm', // Responsive padding, rounding, text
                'bg-[#F8F8F8] dark:bg-[#1A1A1A]',
                'border border-[#E5E5E5] dark:border-[#333333]',
                'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                'focus:outline-none focus:ring-1 focus:ring-bolt-elements-borderColorActive',
                'disabled:opacity-50',
              )}
            />
            <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-bolt-elements-textSecondary"> {/* Responsive margin & text */}
              <a
                href={`https://github.com/settings/tokens${connection.tokenType === 'fine-grained' ? '/beta' : '/new'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-bolt-elements-borderColorActive hover:underline inline-flex items-center gap-0.5 sm:gap-1" // Responsive gap
              >
                Get your token
                <div className="i-ph:arrow-square-out w-3 h-3 sm:w-4 sm:h-4" /> {/* Responsive icon */}
              </a>
              <span className="mx-1 sm:mx-2">•</span> {/* Responsive margin */}
              <span>
                Required scopes:{' '}
                {connection.tokenType === 'classic'
                  ? 'repo, read:org, read:user'
                  : 'Repository access, Organization access'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"> {/* Responsive layout & gap */}
          {!connection.user ? (
            <Button
              onClick={handleConnect}
              disabled={isConnecting || !connection.token}
              size="sm" // Responsive via Button definition
              className={classNames(
                'flex items-center justify-center gap-1.5 sm:gap-2', // Responsive gap
                'bg-[#303030] text-white',
                'hover:bg-[#5E41D0] hover:text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200',
                'transform active:scale-95 w-full sm:w-auto', // Full width on mobile
              )}
            >
              {isConnecting ? (
                <>
                  <div className="i-ph:spinner-gap animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4" /> {/* Responsive icon */}
                  Connecting...
                </>
              ) : (
                <>
                  <div className="i-ph:plug-charging w-3.5 h-3.5 sm:w-4 sm:h-4" /> {/* Responsive icon */}
                  Connect
                </>
              )}
            </Button>
          ) : (
            <>
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between w-full"> {/* Ensure this container is also responsive */}
                <div className="flex items-center gap-2 sm:gap-4"> {/* Responsive gap */}
                  <Button
                    onClick={handleDisconnect}
                    size="sm"
                    variant="destructive" // Using destructive variant for disconnect
                    className="flex items-center justify-center gap-1.5 sm:gap-2 w-full sm:w-auto"
                  >
                    <div className="i-ph:plug w-3.5 h-3.5 sm:w-4 sm:h-4" /> {/* Responsive icon */}
                    Disconnect
                  </Button>
                  <span className="text-xs sm:text-sm text-bolt-elements-textSecondary flex items-center gap-1"> {/* Responsive text & gap */}
                    <div className="i-ph:check-circle w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" /> {/* Responsive icon */}
                    Connected to GitHub
                  </span>
                </div>
                {/* Actions moved to SectionHeader, this div can be removed or repurposed if other actions are needed here */}
              </div>
            </>
          )}
        </div>

        {connection.user && connection.stats && (
          <div className="mt-4 sm:mt-6 border-t border-bolt-elements-borderColor dark:border-bolt-elements-borderColor pt-4 sm:pt-6"> {/* Responsive margin & padding */}
            <div className="flex flex-col items-center sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-1 rounded-lg sm:rounded-xl mb-3 sm:mb-4"> {/* Responsive padding, rounding, margin, layout */}
              <img
                src={connection.user.avatar_url}
                alt={connection.user.login}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-bolt-elements-item-contentAccent dark:border-bolt-elements-item-contentAccent" // Responsive size
              />
              <div className="text-center sm:text-left"> {/* Text alignment */}
                <h4 className="text-sm sm:text-base font-medium text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary"> {/* Responsive text */}
                  {connection.user.name || connection.user.login}
                </h4>
                <p className="text-xs sm:text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary"> {/* Responsive text */}
                  {connection.user.login}
                </p>
              </div>
            </div>

            <Collapsible open={isStatsExpanded} onOpenChange={setIsStatsExpanded}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl bg-bolt-elements-background dark:bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor hover:border-bolt-elements-borderColorActive/70 dark:hover:border-bolt-elements-borderColorActive/70 transition-all duration-200"> {/* Responsive padding & rounding */}
                  <div className="flex items-center gap-1.5 sm:gap-2"> {/* Responsive gap */}
                    <div className="i-ph:chart-bar w-3.5 h-3.5 sm:w-4 sm:h-4 text-bolt-elements-item-contentAccent" /> {/* Responsive icon */}
                    <span className="text-xs sm:text-sm font-medium text-bolt-elements-textPrimary">GitHub Stats</span> {/* Responsive text */}
                  </div>
                  <div
                    className={classNames(
                      'i-ph:caret-down w-4 h-4 transform transition-transform duration-200 text-bolt-elements-textSecondary',
                      isStatsExpanded ? 'rotate-180' : '',
                    )}
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden">
                <div className="space-y-3 sm:space-y-4 mt-2 sm:mt-4"> {/* Responsive space & margin */}

                  <div className="mb-4 sm:mb-6"> {/* Responsive margin */}
                    <h4 className="text-xs sm:text-sm font-medium text-bolt-elements-textPrimary mb-2 sm:mb-3">Top Languages</h4> {/* Responsive text & margin */}
                    <div className="flex flex-wrap gap-1.5 sm:gap-2"> {/* Responsive gap */}
                      {Object.entries(connection.stats.languages)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([language]) => (
                          <span
                            key={language}
                            className="px-2 py-1 text-[10px] sm:text-xs rounded-full bg-bolt-elements-sidebar-buttonBackgroundDefault text-bolt-elements-sidebar-buttonText" // Responsive padding & text
                          >
                            {language}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6"> {/* Responsive gap & margin */}
                    {[
                      { label: 'Member Since', value: new Date(connection.user.created_at).toLocaleDateString() },
                      { label: 'Public Gists', value: connection.stats.publicGists },
                      { label: 'Organizations', value: connection.stats.organizations ? connection.stats.organizations.length : 0 },
                      { label: 'Languages', value: Object.keys(connection.stats.languages).length },
                    ].map((stat, index) => (
                      <div key={index} className="flex flex-col p-2 sm:p-3 rounded-lg bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor"> {/* Responsive padding */}
                        <span className="text-[10px] sm:text-xs text-bolt-elements-textSecondary">{stat.label}</span> {/* Responsive text */}
                        <span className="text-sm sm:text-lg font-medium text-bolt-elements-textPrimary">{stat.value}</span> {/* Responsive text */}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 sm:space-y-4"> {/* Responsive space */}
                    <div>
                      <h5 className="text-xs sm:text-sm font-medium text-bolt-elements-textPrimary mb-1.5 sm:mb-2">Repository Stats</h5> {/* Responsive text & margin */}
                      <div className="grid grid-cols-2 gap-2 sm:gap-4"> {/* Responsive gap */}
                        {[ { label: 'Public Repos', value: connection.stats.publicRepos }, { label: 'Private Repos', value: connection.stats.privateRepos }].map((stat, index) => (
                            <div key={index} className="flex flex-col p-2 sm:p-3 rounded-lg bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor">
                              <span className="text-[10px] sm:text-xs text-bolt-elements-textSecondary">{stat.label}</span>
                              <span className="text-sm sm:text-lg font-medium text-bolt-elements-textPrimary">{stat.value}</span>
                            </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs sm:text-sm font-medium text-bolt-elements-textPrimary mb-1.5 sm:mb-2">Contribution Stats</h5>
                      <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 sm:gap-4"> {/* Responsive grid */}
                        {[
                          { label: 'Stars', value: connection.stats.stars || 0, icon: 'i-ph:star', iconColor: 'text-bolt-elements-icon-warning' },
                          { label: 'Forks', value: connection.stats.forks || 0, icon: 'i-ph:git-fork', iconColor: 'text-bolt-elements-icon-info' },
                          { label: 'Followers', value: connection.stats.followers || 0, icon: 'i-ph:users', iconColor: 'text-bolt-elements-icon-success' },
                        ].map((stat, index) => (
                          <div key={index} className="flex flex-col p-2 sm:p-3 rounded-lg bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor">
                            <span className="text-[10px] sm:text-xs text-bolt-elements-textSecondary">{stat.label}</span>
                            <span className="text-sm sm:text-lg font-medium text-bolt-elements-textPrimary flex items-center gap-1">
                              <div className={`${stat.icon} w-3.5 h-3.5 sm:w-4 sm:h-4 ${stat.iconColor}`} /> {/* Responsive icon */}
                              {stat.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs sm:text-sm font-medium text-bolt-elements-textPrimary mb-1.5 sm:mb-2">Gists</h5>
                      <div className="grid grid-cols-2 gap-2 sm:gap-4">
                        {[ { label: 'Public', value: connection.stats.publicGists }, { label: 'Private', value: connection.stats.privateGists || 0 } ].map((stat, index) => (
                            <div key={index} className="flex flex-col p-2 sm:p-3 rounded-lg bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor">
                              <span className="text-[10px] sm:text-xs text-bolt-elements-textSecondary">{stat.label}</span>
                              <span className="text-sm sm:text-lg font-medium text-bolt-elements-textPrimary">{stat.value}</span>
                            </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-1.5 sm:pt-2 border-t border-bolt-elements-borderColor"> {/* Responsive padding */}
                      <span className="text-[10px] sm:text-xs text-bolt-elements-textSecondary"> {/* Responsive text */}
                        Last updated: {new Date(connection.stats.lastUpdated).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4"> {/* Responsive space & margin */}
                    <h4 className="text-xs sm:text-sm font-medium text-bolt-elements-textPrimary">Recent Repositories</h4> {/* Responsive text */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4"> {/* Responsive gap */}
                      {connection.stats.repos.slice(0,4).map((repo) => ( // Limit to 4 for smaller screens initially if too cluttered
                        <a
                          key={repo.full_name}
                          href={repo.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group block p-3 sm:p-4 rounded-lg bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor hover:border-bolt-elements-borderColorActive dark:hover:border-bolt-elements-borderColorActive transition-all duration-200" // Responsive padding
                        >
                          <div className="space-y-2 sm:space-y-3"> {/* Responsive space */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-1.5 sm:gap-2"> {/* Responsive gap */}
                                <div className="i-ph:git-branch w-3.5 h-3.5 sm:w-4 sm:h-4 text-bolt-elements-icon-tertiary" /> {/* Responsive icon */}
                                <h5 className="text-xs sm:text-sm font-medium text-bolt-elements-textPrimary group-hover:text-bolt-elements-item-contentAccent transition-colors"> {/* Responsive text */}
                                  {repo.name}
                                </h5>
                              </div>
                              <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-bolt-elements-textSecondary"> {/* Responsive gap & text */}
                                <span className="flex items-center gap-0.5 sm:gap-1" title="Stars"> {/* Responsive gap */}
                                  <div className="i-ph:star w-3 h-3 sm:w-3.5 sm:h-3.5 text-bolt-elements-icon-warning" /> {/* Responsive icon */}
                                  {repo.stargazers_count.toLocaleString()}
                                </span>
                                <span className="flex items-center gap-0.5 sm:gap-1" title="Forks">
                                  <div className="i-ph:git-fork w-3 h-3 sm:w-3.5 sm:h-3.5 text-bolt-elements-icon-info" />
                                  {repo.forks_count.toLocaleString()}
                                </span>
                              </div>
                            </div>

                            {repo.description && (
                              <p className="text-[10px] sm:text-xs text-bolt-elements-textSecondary line-clamp-2"> {/* Responsive text */}
                                {repo.description}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-bolt-elements-textSecondary"> {/* Responsive gap & text, flex-wrap */}
                              <span className="flex items-center gap-0.5 sm:gap-1" title="Default Branch"> {/* Responsive gap */}
                                <div className="i-ph:git-branch w-3 h-3 sm:w-3.5 sm:h-3.5" /> {/* Responsive icon */}
                                {repo.default_branch}
                              </span>
                              <span className="flex items-center gap-0.5 sm:gap-1" title="Last Updated">
                                <div className="i-ph:clock w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                {new Date(repo.updated_at).toLocaleDateString(undefined, {
                                  year: 'numeric', month: 'short', day: 'numeric',
                                })}
                              </span>
                              <span className="flex items-center gap-0.5 sm:gap-1 ml-auto group-hover:text-bolt-elements-item-contentAccent transition-colors">
                                <div className="i-ph:arrow-square-out w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                View
                              </span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </div>
    </motion.div>
  );
}
