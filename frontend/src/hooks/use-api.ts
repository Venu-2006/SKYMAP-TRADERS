import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

type Query = Record<string, string | number | boolean | undefined>;

/** Fetches an authenticated endpoint and exposes data/meta/error plus a reload function. */
export function useApi<T, M = unknown>(path: string | null, query?: Query) {
  const [data, setData] = useState<T | null>(null);
  const [meta, setMeta] = useState<M | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const queryKey = JSON.stringify(query ?? {});

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      const r = await api<T, M>(path, { query: JSON.parse(queryKey) });
      setData(r.data);
      setMeta(r.meta ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [path, queryKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, meta, error, loading, reload, setData };
}
