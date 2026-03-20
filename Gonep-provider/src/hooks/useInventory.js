import { useEffect, useState } from 'react';
import { getInventory } from '../api';

export function useInventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading]     = useState(true);
  useEffect(() => {
    let m = true;
    getInventory().then((d) => { if (m) { setInventory(d || []); setLoading(false); } });
    return () => { m = false; };
  }, []);
  return { inventory, setInventory, loading };
}
