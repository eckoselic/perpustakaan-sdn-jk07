'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { callApi } from './api';
import { useAuth } from '@/components/AuthProvider';

export function useFetch<T>(action: string, params: Record<string, any>) {
  const { session } = useAuth();
  const token = session?.token;
  const key = JSON.stringify(params);
  const seq = useRef(0);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!token) return;
    const my = ++seq.current;
    setLoading(true);
    try {
      const r = await callApi<T>(action, JSON.parse(key), token);
      if (my === seq.current) { setData(r); setError(''); }
    } catch (e: any) {
      if (my === seq.current) setError(e.message || 'Gagal memuat data.');
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [action, key, token]);

  useEffect(() => { reload(); }, [reload]);
  return { data, loading, error, reload };
}
