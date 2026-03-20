import { useEffect, useState } from 'react';
import { getAppointments } from '../api';

export function useAppointments(initialFilters) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await getAppointments(initialFilters || {});
        if (mounted) {
          setAppointments(data || []);
        }
      } catch (e) {
        if (mounted) {
          setError(e);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [initialFilters]);

  return { appointments, loading, error, setAppointments };
}

