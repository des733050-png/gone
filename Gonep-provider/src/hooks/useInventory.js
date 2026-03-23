import { useState, useEffect, useCallback } from 'react';
import { getInventory } from '../api';

export function useInventory() {
  const [inventory, setInventory] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getInventory();
      // Only show active items; preserve full objects including history
      setInventory((data || []).filter(item => item.active !== false));
    } catch (e) {
      setError(e?.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { inventory, loading, error, reload: load };
}
