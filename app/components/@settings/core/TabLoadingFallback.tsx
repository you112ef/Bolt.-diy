import React from 'react';

export const TabLoadingFallback = () => (
  <div className="flex items-center justify-center p-8 sm:p-12 text-sm text-bolt-elements-textSecondary">
    <div className="i-ph:spinner-gap w-5 h-5 sm:w-6 sm:h-6 animate-spin mr-2 sm:mr-3" />
    Loading tab content...
  </div>
);
