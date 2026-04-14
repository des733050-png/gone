// ─── hooks/useStaff.js ───────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { MOCK_STAFF } from '../mock/data';
import { suspendStaff, reactivateStaff, appendLog } from '../api';
import { ROLE_FILTER_OPTIONS } from '../constants/staff';

export function useStaff(propFilter) {
  const [staffList, setStaffList] = useState(MOCK_STAFF.map(m => ({ ...m, suspended: false })));
  const [filter,    setFilter]    = useState(propFilter || 'all');
  const [search,    setSearch]    = useState('');
  const [addModal,  setAddModal]  = useState(false);
  const [editModal, setEditModal] = useState({ visible: false, member: null });

  useEffect(() => { if (propFilter) setFilter(propFilter); }, [propFilter]);

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
      staff: 'Admin', staff_id: 'usr-HA-001', role: 'hospital_admin',
      module: 'Staff', action: 'Account suspended',
      detail: `${m?.first_name} ${m?.last_name}`, type: 'staff',
    });
    setStaffList(prev => prev.map(x => x.id === id ? { ...x, suspended: true } : x));
  }, [staffList]);

  const handleReactivate = useCallback(async (id) => {
    await reactivateStaff(id);
    const m = staffList.find(x => x.id === id);
    appendLog({
      staff: 'Admin', staff_id: 'usr-HA-001', role: 'hospital_admin',
      module: 'Staff', action: 'Account reactivated',
      detail: `${m?.first_name} ${m?.last_name}`, type: 'staff',
    });
    setStaffList(prev => prev.map(x => x.id === id ? { ...x, suspended: false } : x));
  }, [staffList]);

  const addMember  = useCallback((m) => setStaffList(prev => [m, ...prev]), []);
  const editMember = useCallback((updated) =>
    setStaffList(prev => prev.map(x => x.id === updated.id ? { ...x, ...updated } : x))
  , []);

  return {
    staffList, filter, setFilter,
    search, setSearch,
    addModal, setAddModal,
    editModal, setEditModal,
    filtered, counts,
    handleSuspend, handleReactivate,
    addMember, editMember,
  };
}
