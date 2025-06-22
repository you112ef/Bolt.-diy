import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { logStore } from '~/lib/stores/logs';
import { classNames } from '~/utils/classNames';
import Cookies from 'js-cookie';
import { Button } from '~/components/ui/Button';
import { SectionHeader } from '~/components/ui/SectionHeader'; // Import SectionHeader

interface VercelUser {
  uid: string;
  email: string;
  name: string;
  username: string;
  avatar: string;
  createdAt: number;
}

interface VercelTeam {
  id: string;
  slug: string;
  name: string;
  avatar?: string | null;
  membership: {
    role: string;
    createdAt: number;
  };
}

interface VercelConnectionData {
  user: VercelUser | null;
  token: string;
  teams?: VercelTeam[];
}

const VercelLogo = () => (
  <svg viewBox="0 0 512 512" className="w-4 h-4 sm:w-5 sm:h-5"> {/* Responsive icon */}
    <path
      fill="currentColor"
      d="M256 48C141.1 48 48 141.1 48 256s93.1 208 208 208 208-93.1 208-208S370.9 48 256 48zm0 319.7L121.4 144.3h269.2L256 367.7z"
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

export default function VercelConnection() {
  const [connection, setConnection] = useState<VercelConnectionData>({ user: null, token: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetchingTeams, setIsFetchingTeams] = useState(false);

  const fetchVercelUser = async (token: string) => {
    try {
      const response = await fetch('https://api.vercel.com/v2/user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data = (await response.json()) as { user: VercelUser };
      setConnection({ user: data.user, token, teams: connection.teams });
      localStorage.setItem('vercel_connection', JSON.stringify({ user: data.user, token }));
      logStore.logInfo('Connected to Vercel', { type: 'system', message: `Connected to Vercel as ${data.user.username}` });
      fetchVercelTeams(token); // Fetch teams after successful connection
    } catch (error) {
      logStore.logError(`Vercel authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { type: 'system', message: 'Vercel authentication failed' });
      toast.error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  const fetchVercelTeams = async (token: string) => {
    setIsFetchingTeams(true);
    try {
      const response = await fetch('https://api.vercel.com/v1/teams', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Failed to fetch teams: ${response.statusText}`);
      const teams = (await response.json()) as VercelTeam[];
      setConnection((prev) => ({ ...prev, teams }));
      localStorage.setItem('vercel_connection', JSON.stringify({ ...connection, user: connection.user, token, teams }));
      toast.success('Vercel teams refreshed');
    } catch (error) {
      toast.error(`Failed to fetch Vercel teams: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsFetchingTeams(false);
    }
  };

  useEffect(() => {
    const loadSavedConnection = async () => {
      setIsLoading(true);
      const savedConnection = localStorage.getItem('vercel_connection');
      if (savedConnection) {
        try {
          const parsed = JSON.parse(savedConnection) as VercelConnectionData;
          setConnection(parsed);
          if (parsed.user && parsed.token && !parsed.teams) { // Fetch teams if not present
            await fetchVercelTeams(parsed.token);
          }
        } catch (error) { localStorage.removeItem('vercel_connection'); }
      } else {
        const envToken = import.meta.env.VITE_VERCEL_ACCESS_TOKEN as string | undefined;
        if (envToken) {
          try { await fetchVercelUser(envToken); }
          catch (error) { console.error('Failed to connect with Vercel environment token:', error); }
        }
      }
      setIsLoading(false);
    };
    loadSavedConnection();
  }, []);

  const handleConnect = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsConnecting(true);
    try {
      localStorage.setItem('vercel_connection', JSON.stringify({ user: null, token: connection.token }));
      await fetchVercelUser(connection.token);
      toast.success('Connected to Vercel successfully');
    } catch (error) {
      setConnection({ user: null, token: connection.token, teams: [] }); // Keep token on failed attempt
      toast.error(`Failed to connect to Vercel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('vercel_connection');
    setConnection({ user: null, token: '', teams: [] });
    toast.success('Disconnected from Vercel');
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <motion.div
      className="bg-bolt-elements-background dark:bg-bolt-elements-background border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor rounded-md sm:rounded-lg" // Responsive rounding
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }} // Adjusted delay
    >
      <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4"> {/* Responsive padding and space */}
        <SectionHeader
            icon={<VercelLogo />}
            title="Vercel Connection"
            className="pb-3 sm:pb-4 border-b border-bolt-elements-borderColor mb-0" // Remove default bottom margin from SectionHeader
        />

        {!connection.user && (
          <div className="text-[10px] sm:text-xs text-bolt-elements-textSecondary bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-1 p-2 sm:p-3 rounded-md sm:rounded-lg mb-2 sm:mb-4"> {/* Responsive text, padding, rounding, margin */}
            <p className="flex items-center gap-1 mb-1">
              <span className="i-ph:lightbulb w-3.5 h-3.5 text-bolt-elements-icon-success dark:text-bolt-elements-icon-success" />
              <span className="font-medium">Tip:</span> You can also set the{' '}
              <code className="px-1 py-0.5 bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 rounded">
                VITE_VERCEL_ACCESS_TOKEN
              </code>{' '}
              environment variable to connect automatically.
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs sm:text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary mb-1.5 sm:mb-2"> {/* Responsive text & margin */}
            Vercel Access Token
          </label>
          <input
            type="password"
            value={connection.token}
            onChange={(e) => setConnection((prev) => ({ ...prev, token: e.target.value }))}
            disabled={isConnecting || !!connection.user}
            placeholder="Enter your Vercel access token"
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
              href="https://vercel.com/account/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-bolt-elements-borderColorActive hover:underline inline-flex items-center gap-0.5 sm:gap-1" // Responsive gap
            >
              Create a new token on Vercel
              <div className="i-ph:arrow-square-out w-3 h-3 sm:w-4 sm:h-4" /> {/* Responsive icon */}
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"> {/* Responsive layout & gap */}
          {!connection.user ? (
            <Button
              onClick={handleConnect}
              disabled={isConnecting || !connection.token}
              size="sm"
              className={classNames(
                'flex items-center justify-center gap-1.5 sm:gap-2',
                'bg-black text-white dark:bg-white dark:text-black', // Vercel brand colors
                'hover:opacity-80',
                'disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200',
                'transform active:scale-95 w-full sm:w-auto',
              )}
            >
              {isConnecting ? (
                <>
                  <div className="i-ph:spinner-gap animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Connecting...
                </>
              ) : (
                <>
                  <div className="i-ph:plug-charging w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Connect
                </>
              )}
            </Button>
          ) : (
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
              <div className="flex items-center gap-2 sm:gap-4">
                <Button
                  onClick={handleDisconnect}
                  size="sm"
                  variant="destructive"
                  className="flex items-center justify-center gap-1.5 sm:gap-2 w-full sm:w-auto"
                >
                  <div className="i-ph:plug w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Disconnect
                </Button>
                <span className="text-xs sm:text-sm text-bolt-elements-textSecondary flex items-center gap-1">
                  <div className="i-ph:check-circle w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                  Connected to Vercel
                </span>
              </div>
              <Button
                onClick={() => fetchVercelTeams(connection.token)}
                disabled={isFetchingTeams}
                variant="outline"
                size="sm"
                className="flex items-center justify-center gap-1.5 sm:gap-2"
              >
                {isFetchingTeams ? (
                  <>
                    <div className="i-ph:spinner-gap w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    Refreshing Teams...
                  </>
                ) : (
                  <>
                    <div className="i-ph:arrows-clockwise w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Refresh Teams
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {connection.user && (
          <div className="mt-4 sm:mt-6 border-t border-bolt-elements-borderColor pt-4 sm:pt-6">
            <div className="flex flex-col items-center sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-1 rounded-lg sm:rounded-xl mb-3 sm:mb-4">
              <img
                src={connection.user.avatar}
                alt={connection.user.username}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-bolt-elements-item-contentAccent dark:border-bolt-elements-item-contentAccent"
              />
              <div className="text-center sm:text-left">
                <h4 className="text-sm sm:text-base font-medium text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary">
                  {connection.user.name || connection.user.username}
                </h4>
                <p className="text-xs sm:text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary">
                  {connection.user.email}
                </p>
              </div>
            </div>

            <h4 className="text-xs sm:text-sm font-medium text-bolt-elements-textPrimary mb-2 sm:mb-3">Teams ({connection.teams?.length || 0})</h4>
            {(connection.teams && connection.teams.length > 0) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 max-h-64 sm:max-h-72 overflow-y-auto pr-1 modern-scrollbar">
                {connection.teams.map(team => (
                  <a
                    key={team.id}
                    href={`https://vercel.com/${team.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block p-2.5 sm:p-3 rounded-md sm:rounded-lg bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-200"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      {team.avatar && <img src={team.avatar} alt={team.name} className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover" />} {/* Responsive size */}
                      {!team.avatar && <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">{team.name.charAt(0)}</div>}
                      <div className="flex-1 overflow-hidden">
                        <h5 className="text-[11px] sm:text-xs font-medium text-bolt-elements-textPrimary group-hover:text-bolt-elements-textPrimary transition-colors truncate">{team.name}</h5>
                        <p className="text-[10px] sm:text-xs text-bolt-elements-textSecondary truncate">Role: {team.membership.role}</p>
                      </div>
                      <div className="i-ph:arrow-square-out w-3 h-3 sm:w-4 sm:h-4 text-bolt-elements-textTertiary group-hover:text-bolt-elements-textPrimary transition-colors" />
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-bolt-elements-textSecondary">No teams found for this account.</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
