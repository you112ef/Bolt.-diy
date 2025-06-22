import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { logStore } from '~/lib/stores/logs';
import { classNames } from '~/utils/classNames';
import Cookies from 'js-cookie';
import { Button } from '~/components/ui/Button';
import { SectionHeader } from '~/components/ui/SectionHeader'; // Import SectionHeader

interface NetlifyUser {
  id: string;
  uid?: string;
  full_name: string;
  avatar_url: string;
  email: string;
  created_at: string;
}

interface NetlifySite {
  id: string;
  name: string;
  url: string;
  admin_url: string;
  screenshot_url?: string;
  updated_at: string;
}

interface NetlifyConnectionData {
  user: NetlifyUser | null;
  token: string;
  sites?: NetlifySite[];
}

const NetlifyLogo = () => (
  <svg viewBox="0 0 512 512" className="w-4 h-4 sm:w-5 sm:h-5"> {/* Responsive icon */}
    <path
      fill="currentColor"
      d="M256 48C141.1 48 48 141.1 48 256s93.1 208 208 208 208-93.1 208-208S370.9 48 256 48zm0 319.7c-74.3 0-134.6-52.3-134.6-116.6c0-59.2 46.1-108.1 112.1-115.5V128H198v32.6c-25.5 15.9-42.7 43.2-42.7 75.4c0 47.8 38.9 86.7 86.7 86.7s86.7-38.9 86.7-86.7c0-32.2-17.2-59.5-42.7-75.4V128h-35.5v7.6c66 7.4 112.1 56.3 112.1 115.5c0 64.3-60.3 116.6-134.6 116.6z"
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

export default function NetlifyConnection() {
  const [connection, setConnection] = useState<NetlifyConnectionData>({ user: null, token: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetchingSites, setIsFetchingSites] = useState(false);

  const fetchNetlifyUser = async (token: string) => {
    try {
      const response = await fetch('https://api.netlify.com/api/v1/user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data = (await response.json()) as NetlifyUser;
      setConnection({ user: data, token, sites: connection.sites });
      localStorage.setItem('netlify_connection', JSON.stringify({ user: data, token }));
      Cookies.set('netlifyToken', token, { expires: 30 });
      logStore.logInfo('Connected to Netlify', { type: 'system', message: `Connected to Netlify as ${data.full_name}` });
      fetchNetlifySites(token); // Fetch sites after successful connection
    } catch (error) {
      logStore.logError(`Netlify authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { type: 'system', message: 'Netlify authentication failed' });
      toast.error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  const fetchNetlifySites = async (token: string) => {
    setIsFetchingSites(true);
    try {
      const response = await fetch('https://api.netlify.com/api/v1/sites', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Failed to fetch sites: ${response.statusText}`);
      const sites = (await response.json()) as NetlifySite[];
      setConnection((prev) => ({ ...prev, sites }));
      localStorage.setItem('netlify_connection', JSON.stringify({ ...connection, sites }));
      toast.success('Netlify sites refreshed');
    } catch (error) {
      toast.error(`Failed to fetch Netlify sites: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsFetchingSites(false);
    }
  };

  useEffect(() => {
    const loadSavedConnection = async () => {
      setIsLoading(true);
      const savedConnection = localStorage.getItem('netlify_connection');
      if (savedConnection) {
        try {
          const parsed = JSON.parse(savedConnection) as NetlifyConnectionData;
          setConnection(parsed);
          if (parsed.user && parsed.token && !parsed.sites) {
            await fetchNetlifySites(parsed.token);
          }
        } catch (error) { localStorage.removeItem('netlify_connection'); }
      } else {
        const envToken = import.meta.env.VITE_NETLIFY_ACCESS_TOKEN as string | undefined;
        if (envToken) {
          try { await fetchNetlifyUser(envToken); }
          catch (error) { console.error('Failed to connect with Netlify environment token:', error); }
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
      localStorage.setItem('netlify_connection', JSON.stringify({ user: null, token: connection.token }));
      await fetchNetlifyUser(connection.token);
      toast.success('Connected to Netlify successfully');
    } catch (error) {
      setConnection({ user: null, token: connection.token, sites: [] }); // Keep token on failed attempt
      toast.error(`Failed to connect to Netlify: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('netlify_connection');
    Cookies.remove('netlifyToken');
    setConnection({ user: null, token: '', sites: [] });
    toast.success('Disconnected from Netlify');
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <motion.div
      className="bg-bolt-elements-background dark:bg-bolt-elements-background border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor rounded-md sm:rounded-lg" // Responsive rounding
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }} // Adjusted delay
    >
      <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4"> {/* Responsive padding and space */}
         <SectionHeader
            icon={<NetlifyLogo />}
            title="Netlify Connection"
            className="pb-3 sm:pb-4 border-b border-bolt-elements-borderColor mb-0" // Remove default bottom margin from SectionHeader
         />

        {!connection.user && (
          <div className="text-[10px] sm:text-xs text-bolt-elements-textSecondary bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-1 p-2 sm:p-3 rounded-md sm:rounded-lg mb-2 sm:mb-4"> {/* Responsive text, padding, rounding, margin */}
            <p className="flex items-center gap-1 mb-1">
              <span className="i-ph:lightbulb w-3.5 h-3.5 text-bolt-elements-icon-success dark:text-bolt-elements-icon-success" />
              <span className="font-medium">Tip:</span> You can also set the{' '}
              <code className="px-1 py-0.5 bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 rounded">
                VITE_NETLIFY_ACCESS_TOKEN
              </code>{' '}
              environment variable to connect automatically.
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs sm:text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary mb-1.5 sm:mb-2"> {/* Responsive text & margin */}
            Netlify Access Token
          </label>
          <input
            type="password"
            value={connection.token}
            onChange={(e) => setConnection((prev) => ({ ...prev, token: e.target.value }))}
            disabled={isConnecting || !!connection.user}
            placeholder="Enter your Netlify access token"
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
              href="https://app.netlify.com/user/applications#personal-access-tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-bolt-elements-borderColorActive hover:underline inline-flex items-center gap-0.5 sm:gap-1" // Responsive gap
            >
              Get your token from Netlify
              <div className="i-ph:arrow-square-out w-3 h-3 sm:w-4 sm:h-4" /> {/* Responsive icon */}
            </a>
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
                'bg-[#00C7B7] text-white', // Netlify brand color
                'hover:bg-[#00A393]',
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
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between w-full"> {/* Responsive layout & gap */}
              <div className="flex items-center gap-2 sm:gap-4"> {/* Responsive gap */}
                <Button
                  onClick={handleDisconnect}
                  size="sm"
                  variant="destructive"
                  className="flex items-center justify-center gap-1.5 sm:gap-2 w-full sm:w-auto"
                >
                  <div className="i-ph:plug w-3.5 h-3.5 sm:w-4 sm:h-4" /> {/* Responsive icon */}
                  Disconnect
                </Button>
                <span className="text-xs sm:text-sm text-bolt-elements-textSecondary flex items-center gap-1"> {/* Responsive text & gap */}
                  <div className="i-ph:check-circle w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" /> {/* Responsive icon */}
                  Connected to Netlify
                </span>
              </div>
              <Button
                onClick={() => fetchNetlifySites(connection.token)}
                disabled={isFetchingSites}
                variant="outline"
                size="sm"
                className="flex items-center justify-center gap-1.5 sm:gap-2"
              >
                {isFetchingSites ? (
                  <>
                    <div className="i-ph:spinner-gap w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> {/* Responsive icon */}
                    Refreshing Sites...
                  </>
                ) : (
                  <>
                    <div className="i-ph:arrows-clockwise w-3.5 h-3.5 sm:w-4 sm:h-4" /> {/* Responsive icon */}
                    Refresh Sites
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {connection.user && connection.sites && (
          <div className="mt-4 sm:mt-6 border-t border-bolt-elements-borderColor pt-4 sm:pt-6"> {/* Responsive margin & padding */}
            <div className="flex flex-col items-center sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-1 rounded-lg sm:rounded-xl mb-3 sm:mb-4"> {/* Responsive padding, rounding, margin, layout */}
              <img
                src={connection.user.avatar_url}
                alt={connection.user.full_name || connection.user.email}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-bolt-elements-item-contentAccent dark:border-bolt-elements-item-contentAccent" // Responsive size
              />
              <div className="text-center sm:text-left"> {/* Text alignment */}
                <h4 className="text-sm sm:text-base font-medium text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary"> {/* Responsive text */}
                  {connection.user.full_name || connection.user.email}
                </h4>
                <p className="text-xs sm:text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary"> {/* Responsive text */}
                  UID: {connection.user.uid || connection.user.id}
                </p>
              </div>
            </div>

            <h4 className="text-xs sm:text-sm font-medium text-bolt-elements-textPrimary mb-2 sm:mb-3">Available Sites ({connection.sites.length})</h4> {/* Responsive text & margin */}
            {connection.sites.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 max-h-64 sm:max-h-72 overflow-y-auto pr-1 modern-scrollbar"> {/* Responsive gap & max-height */}
                {connection.sites.map(site => (
                  <a
                    key={site.id}
                    href={site.admin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block p-2.5 sm:p-3 rounded-md sm:rounded-lg bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor hover:border-teal-500/70 dark:hover:border-teal-400/70 transition-all duration-200" // Responsive padding & rounding
                  >
                    <div className="flex items-center gap-2 sm:gap-3"> {/* Responsive gap */}
                      {site.screenshot_url && <img src={site.screenshot_url} alt={site.name} className="w-8 h-8 sm:w-10 sm:h-10 rounded object-cover" />} {/* Responsive size */}
                      <div className="flex-1 overflow-hidden">
                        <h5 className="text-[11px] sm:text-xs font-medium text-bolt-elements-textPrimary group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors truncate">{site.name}</h5> {/* Responsive text */}
                        <p className="text-[10px] sm:text-xs text-bolt-elements-textSecondary truncate">{site.url}</p> {/* Responsive text */}
                      </div>
                      <div className="i-ph:arrow-square-out w-3 h-3 sm:w-4 sm:h-4 text-bolt-elements-textTertiary group-hover:text-teal-500 transition-colors" /> {/* Responsive icon */}
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-bolt-elements-textSecondary">No sites found for this account.</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
