// ─── hooks/useSupportTickets.js ──────────────────────────────────────────────
import { useState, useCallback, useEffect, useMemo } from 'react';
import { appendLog, createSupportTicket, getSupportTickets, updateSupportTicket } from '../api';
import { canSeeTicket } from '../constants/support';

export function useSupportTickets(user, propFilter) {
  const [tickets,     setTickets]     = useState([]);
  const [filter,      setFilter]      = useState(propFilter || 'all');
  const [newModal,    setNewModal]    = useState(false);
  const [detailModal, setDetailModal] = useState({ visible: false, ticket: null });
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  useEffect(() => { if (propFilter) setFilter(propFilter); }, [propFilter]);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const rows = await getSupportTickets();
      setTickets(rows || []);
    } catch (err) {
      setError(err?.message || 'Unable to load support tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(
    () => tickets.filter(t => canSeeTicket(t, user)),
    [tickets, user]
  );

  const filtered = visible.filter(t => {
    if (filter === 'mine')     return t.raised_by === user?.id;
    if (filter === 'open')     return t.status === 'open';
    if (filter === 'progress') return t.status === 'in_progress';
    if (filter === 'resolved') return t.status === 'resolved' || t.status === 'closed';
    return true;
  });

  const handleUpdate = useCallback(async (id, patch) => {
    const next = await updateSupportTicket(id, patch);
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...(next || patch) } : t));
    setDetailModal(d =>
      d.ticket?.id === id ? { ...d, ticket: { ...d.ticket, ...(next || patch) } } : d
    );
    if (patch?.responses) {
      appendLog({
        staff: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'Provider',
        staff_id: user?.id,
        role: user?.role,
        module: 'Support',
        action: 'support_ticket_responded',
        detail: JSON.stringify({ ticket_id: id }),
        type: 'support',
      });
    }
    if (patch?.status != null) {
      appendLog({
        staff: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'Provider',
        staff_id: user?.id,
        role: user?.role,
        module: 'Support',
        action: 'support_ticket_status_changed',
        detail: JSON.stringify({ ticket_id: id, status: patch.status }),
        type: 'support',
      });
    }
  }, [user]);

  const addTicket = useCallback(async (ticket) => {
    const created = await createSupportTicket(ticket);
    setTickets(prev => [created, ...prev]);
    appendLog({
      staff: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'Provider',
      staff_id: user?.id,
      role: user?.role,
      module: 'Support',
      action: 'support_ticket_created',
      detail: JSON.stringify({ ticket_id: created?.id, title: ticket?.title, category: ticket?.category }),
      type: 'support',
    });
    return created;
  }, [user]);

  const openDetail = useCallback((ticket) =>
    setDetailModal({ visible: true, ticket })
  , []);

  const closeDetail = useCallback(() =>
    setDetailModal({ visible: false, ticket: null })
  , []);

  const openCountByStatus = (status) =>
    visible.filter(t => t.status === status).length;

  return {
    tickets, filter, setFilter,
    newModal, setNewModal,
    detailModal,
    loading, error, refresh: load,
    visible, filtered,
    handleUpdate, addTicket,
    openDetail, closeDetail,
    openCountByStatus,
  };
}
