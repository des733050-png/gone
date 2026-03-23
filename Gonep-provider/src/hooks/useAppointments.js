import { useState, useEffect, useCallback } from 'react';
import { getAppointments } from '../api';

export function useAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAppointments();
      setAppointments(data || []);
    } catch (e) {
      setError(e?.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { appointments, loading, error, reload: load };
}
