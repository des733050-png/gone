import { useState, useEffect } from 'react';
import { getAppointments } from '../api';

export function useAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let m = true;
    getAppointments().then(data => { if (m) { setAppointments(data || []); setLoading(false); } }).catch(() => setLoading(false));
    return () => { m = false; };
  }, []);

  return { appointments, loading };
}
