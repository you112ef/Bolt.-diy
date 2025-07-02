import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('searchService');

export interface SearchResultItem {
  title: string;
  link: string;
  snippet: string;
}

export interface SearchServiceError {
  error: string;
  details?: string;
}

export async function fetchSearchResults(query: string): Promise<SearchResultItem[] | SearchServiceError> {
  if (!query.trim()) {
    return { error: 'Query cannot be empty' };
  }

  logger.info(`Fetching search results for: "${query}" from internal API`);
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (!response.ok) {
      logger.error('Search API returned an error:', data);
      return data as SearchServiceError || { error: `API request failed with status ${response.status}` };
    }

    return data as SearchResultItem[];
  } catch (error: any) {
    logger.error('Error calling search API:', error);
    return { error: 'Failed to fetch search results due to a network or parsing error', details: error.message };
  }
}
