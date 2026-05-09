import { useState, useEffect, useCallback } from 'react';
import { getAppointments } from '../api';

export function useAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [recycleBinAppointments, setRecycleBinAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [activeData, recycleData] = await Promise.all([
        getAppointments({ bin: false }),
        getAppointments({ bin: true }),
      ]);
      setAppointments(activeData || []);
      setRecycleBinAppointments(recycleData || []);
    } catch (e) {
      setError(e?.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { appointments, recycleBinAppointments, loading, error, reload: load };
}
