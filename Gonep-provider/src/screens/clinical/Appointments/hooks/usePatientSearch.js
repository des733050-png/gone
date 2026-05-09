import { useCallback, useEffect, useRef, useState } from 'react';
import { searchBookingPatients } from '../../../../api';

export function usePatientSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const reqId = useRef(0);
  const timer = useRef(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    const id = ++reqId.current;
    timer.current = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const data = await searchBookingPatients(query);
        if (reqId.current !== id) return;
        setResults(data?.results || data || []);
      } catch (e) {
        if (reqId.current !== id) return;
        setError('Search failed');
      } finally {
        if (reqId.current === id) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query]);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setError('');
  }, []);

  return { query, setQuery, results, loading, error, clear };
}
