import { useState, useEffect } from 'react';

// Generic async data loader hook
export function useAsyncData<T>(asyncFn: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    asyncFn()
      .then(result => {
        if (isMounted) setData(result);
      })
      .catch(err => {
        if (isMounted) setError(err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, deps);

  return { data, isLoading, error };
} 