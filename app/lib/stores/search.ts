import { atom, type WritableAtom } from 'nanostores';
import type { SearchResultItem, SearchServiceError } from '~/lib/services/searchService';

export interface SearchUiState {
  results?: SearchResultItem[];
  error?: SearchServiceError | string;
  isLoading: boolean;
  query?: string; // The query that produced these results/error
  timestamp?: number; // To help UIs decide if results are fresh
}

export const searchUiStore: WritableAtom<SearchUiState | null> = atom(null);

// Helper to easily update the store
export function setSearchResults(query: string, results: SearchResultItem[]) {
  searchUiStore.set({
    query,
    results,
    isLoading: false,
    timestamp: Date.now(),
  });
}

export function setSearchError(query: string, error: SearchServiceError | string) {
  searchUiStore.set({
    query,
    error,
    isLoading: false,
    timestamp: Date.now(),
  });
}

export function setSearchLoading(query: string) {
  searchUiStore.set({
    query,
    isLoading: true,
    results: undefined, // Clear previous results
    error: undefined, // Clear previous errors
    timestamp: Date.now(),
  });
}

export function clearSearchResults() {
  searchUiStore.set(null);
}
