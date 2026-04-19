// ─── hooks/useStaff.js ───────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { suspendStaff, reactivateStaff, appendLog, getStaff } from '../api';
import { ROLE_FILTER_OPTIONS } from '../constants/staff';

export function useStaff(propFilter, user) {
  const [staffList, setStaffList] = useState([]);
  const [filter,    setFilter]    = useState(propFilter || 'all');
  const [search,    setSearch]    = useState('');
  const [addModal,  setAddModal]  = useState(false);
  const [editModal, setEditModal] = useState({ visible: false, member: null });
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => { if (propFilter) setFilter(propFilter); }, [propFilter]);
  const loadStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const rows = await getStaff();
      setStaffList((rows || []).map((row) => ({ ...row, suspended: !!row.suspended })));
    } catch (err) {
      setError(err?.message || 'Unable to load staff.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const filtered = staffList.filter(m => {
    const matchRole   = filter === 'all' || m.role === filter;
    const matchSearch = !search ||
      `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const counts = ROLE_FILTER_OPTIONS.reduce((acc, r) => {
    acc[r] = r === 'all' ? staffList.length : staffList.filter(m => m.role === r).length;
    return acc;
  }, {});

  const handleSuspend = useCallback(async (id) => {
    await suspendStaff(id);
    const m = staffList.find(x => x.id === id);
    appendLog({
      staff: user ? `${user.first_name} ${user.last_name}` : 'Admin',
      staff_id: user?.id, role: user?.role || 'hospital_admin',
      module: 'Staff', action: 'Account suspended',
      detail: `${m?.first_name} ${m?.last_name}`, type: 'staff',
    });
    setStaffList(prev => prev.map(x => x.id === id ? { ...x, suspended: true } : x));
  }, [staffList, user]);

  const handleReactivate = useCallback(async (id) => {
    await reactivateStaff(id);
    const m = staffList.find(x => x.id === id);
    appendLog({
      staff: user ? `${user.first_name} ${user.last_name}` : 'Admin',
      staff_id: user?.id, role: user?.role || 'hospital_admin',
      module: 'Staff', action: 'Account reactivated',
      detail: `${m?.first_name} ${m?.last_name}`, type: 'staff',
    });
    setStaffList(prev => prev.map(x => x.id === id ? { ...x, suspended: false } : x));
  }, [staffList, user]);

  const addMember = useCallback((m) => {
    const { invitation: _inv, ...safe } = m || {};
    setStaffList((prev) => [{ ...safe }, ...prev]);
  }, []);
  const editMember = useCallback((updated) =>
    setStaffList(prev => prev.map(x => x.id === updated.id ? { ...x, ...updated } : x))
  , []);

  return {
    staffList, filter, setFilter,
    search, setSearch,
    addModal, setAddModal,
    editModal, setEditModal,
    loading, error,
    filtered, counts,
    handleSuspend, handleReactivate,
    addMember, editMember,
  };
}
