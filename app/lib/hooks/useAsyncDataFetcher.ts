import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify'; // Assuming toast is used for user feedback

interface UseAsyncDataFetcherOptions<T> {
  fetchFn: (...args: any[]) => Promise<T>;
  initialData?: T | null;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  autoFetch?: boolean;
  successMessage?: string;
  errorMessagePrefix?: string;
}

interface UseAsyncDataFetcherReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  fetchData: (...args: any[]) => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
  clearError: () => void;
}

export function useAsyncDataFetcher<T>({
  fetchFn,
  initialData = null,
  onSuccess,
  onError,
  autoFetch = true,
  successMessage,
  errorMessagePrefix = 'Failed to fetch data',
}: UseAsyncDataFetcherOptions<T>): UseAsyncDataFetcherReturn<T> {
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<Error | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchData = useCallback(async (...args: any[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchFn(...args);
      setData(result);
      if (onSuccess) {
        onSuccess(result);
      }
      if (successMessage) {
        toast.success(successMessage);
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error('An unknown error occurred');
      setError(err);
      if (onError) {
        onError(err);
      }
      toast.error(`${errorMessagePrefix}: ${err.message}`);
      console.error(`${errorMessagePrefix}:`, err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, onSuccess, onError, successMessage, errorMessagePrefix]);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]); // Include fetchData in dependency array if it's stable (which it is due to useCallback)

  return { data, isLoading, error, fetchData, setData, clearError };
}
