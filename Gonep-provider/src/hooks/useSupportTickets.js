// ─── hooks/useSupportTickets.js ──────────────────────────────────────────────
import { useState, useCallback, useEffect, useMemo } from 'react';
import { MOCK_SUPPORT_TICKETS } from '../mock/data';
import { canSeeTicket } from '../constants/support';

export function useSupportTickets(user, propFilter) {
  const [tickets,     setTickets]     = useState(MOCK_SUPPORT_TICKETS.map(t => ({ ...t })));
  const [filter,      setFilter]      = useState(propFilter || 'all');
  const [newModal,    setNewModal]    = useState(false);
  const [detailModal, setDetailModal] = useState({ visible: false, ticket: null });

  useEffect(() => { if (propFilter) setFilter(propFilter); }, [propFilter]);

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

  const handleUpdate = useCallback((id, patch) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    setDetailModal(d =>
      d.ticket?.id === id ? { ...d, ticket: { ...d.ticket, ...patch } } : d
    );
  }, []);

  const addTicket = useCallback((ticket) =>
    setTickets(prev => [ticket, ...prev])
  , []);

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
    visible, filtered,
    handleUpdate, addTicket,
    openDetail, closeDetail,
    openCountByStatus,
  };
}
