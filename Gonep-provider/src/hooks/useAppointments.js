import { useEffect, useState } from 'react';
import { getAppointments } from '../api';

export function useAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  useEffect(() => {
    let m = true;
    getAppointments().then((d) => { if (m) { setAppointments(d || []); setLoading(false); } });
    return () => { m = false; };
  }, []);
  return { appointments, setAppointments, loading };
}
