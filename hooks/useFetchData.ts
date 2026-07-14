import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFetchDataOptions<T> {
  initialData?: T[];
  parser?: (item: any) => T;
  fetchOnMount?: boolean;
}

interface UseFetchDataResult<T> {
  data: T[];
  setData: React.Dispatch<React.SetStateAction<T[]>>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFetchData<T>(
  url: string,
  options?: UseFetchDataOptions<T>
): UseFetchDataResult<T> {
  const [data, setData] = useState<T[]>(options?.initialData || []);
  const [loading, setLoading] = useState(options?.fetchOnMount !== false);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef(url);
  urlRef.current = url;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(urlRef.current);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Error HTTP: ${response.status}`);
      }
      let result = await response.json();
      if (options?.parser) {
        result = result.map(options.parser);
      }
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.fetchOnMount !== false) {
      fetchData();
    }
  }, [fetchData]);

  return { data, setData, loading, error, refetch: fetchData };
}
