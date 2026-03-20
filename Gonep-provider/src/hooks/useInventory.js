import { useState, useEffect } from 'react';
import { getInventory } from '../api';

export function useInventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let m = true;
    getInventory().then(data => { if (m) { setInventory(data || []); setLoading(false); } }).catch(() => setLoading(false));
    return () => { m = false; };
  }, []);

  return { inventory, loading };
}
