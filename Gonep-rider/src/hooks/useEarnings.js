import { useEffect, useState } from 'react';
import { getEarnings } from '../api';

export function useEarnings() {
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    let mounted = true;
    getEarnings().then((d) => { if (mounted) { setEarnings(d); setLoading(false); } });
    return () => { mounted = false; };
  }, []);

  return { earnings, loading };
}
