import React from 'react';
import type { SearchResultItem, SearchServiceError } from '~/lib/services/searchService';
import { Card } from '~/components/ui/Card'; // Assuming a Card component exists
import { Button } from '~/components/ui/Button'; // Assuming a Button component exists

interface SearchResultsProps {
  results?: SearchResultItem[];
  error?: SearchServiceError | string; // Can be string for simple errors or object for detailed ones
  isLoading?: boolean;
  onRetry?: () => void;
}

export const SearchResultsDisplay: React.FC<SearchResultsProps> = ({ results, error, isLoading, onRetry }) => {
  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bolt-primary-500 mx-auto"></div>
        <p className="mt-2 text-sm text-bolt-elements-textSecondary">Searching...</p>
      </div>
    );
  }

  if (error) {
    const errorMessage = typeof error === 'string' ? error : error.error;
    const errorDetails = typeof error === 'string' ? undefined : error.details;
    return (
      <div className="p-4 text-center text-red-500">
        <p>Error fetching search results: {errorMessage}</p>
        {errorDetails && <p className="text-xs mt-1">Details: {errorDetails}</p>}
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="mt-4">
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (!results || results.length === 0) {
    return <div className="p-4 text-center text-bolt-elements-textSecondary">No results found.</div>;
  }

  return (
    <div className="space-y-4 p-4">
      {results.map((item, index) => (
        <Card key={index} className="p-4 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-bolt-elements-textPrimary mb-1">
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-bolt-primary-500 hover:underline"
            >
              {item.title}
            </a>
          </h3>
          <p className="text-xs text-green-600 dark:text-green-400 truncate mb-2">{item.link}</p>
          <p className="text-sm text-bolt-elements-textSecondary">{item.snippet}</p>
        </Card>
      ))}
    </div>
  );
};

export default SearchResultsDisplay;
