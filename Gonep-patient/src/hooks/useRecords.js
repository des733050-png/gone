import { useEffect, useState } from 'react';
import { getRecords } from '../api';

export function useRecords() {
  const [records, setRecords] = useState([]);
  const [sections, setSections] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getRecords();
        if (!mounted) return;
        if (Array.isArray(data)) {
          setRecords(data || []);
          setSections(null);
          return;
        }
        setRecords(data?.items || []);
        setSections(data?.sections || null);
      } catch (err) {
        if (mounted) setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return { records, sections, loading, error };
}
