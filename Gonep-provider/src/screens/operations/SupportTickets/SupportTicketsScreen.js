// ─── SupportTicketsScreen.js ──────────────────────────────────────────────────
// All staff can raise tickets. IT Admin + Hospital Admin see and respond.
// Status flow: open → in_progress → resolved → closed
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Badge } from '../../../atoms/Badge';
import { Btn } from '../../../atoms/Btn';
import { Icon } from '../../../atoms/Icon';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { MOCK_SUPPORT_TICKETS } from '../../../mock/data';
import { appendLog } from '../../../api';

const STATUS_COLOR   = { open: 'warning', in_progress: 'primary', resolved: 'success', closed: 'danger' };
const STATUS_LABEL   = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' };
const PRIORITY_COLOR = { low: 'success', medium: 'warning', high: 'danger', critical: 'danger' };
const CATEGORIES     = ['Bug', 'Feature Request', 'Access', 'Performance', 'Data Issue', 'Other'];
const PRIORITIES     = ['low', 'medium', 'high', 'critical'];

// Visibility rules:
//   it_admin         — sees ALL tickets across all facilities; can respond to any
//   hospital_admin   — sees only their facility's tickets; can respond
//   All other roles  — see only their OWN tickets; can raise but not respond
function canRespond(role) {
  return role === 'it_admin' || role === 'hospital_admin';
}

function canSeeTicket(ticket, user) {
  if (!user) return false;
  if (user.role === 'it_admin') return true;                                // IT Admin sees all
  if (user.role === 'hospital_admin') return ticket.facility === (user.facility || 'Nairobi General Hospital');
  return ticket.raised_by === user.id;                                     // others see only own
}

// ─── New ticket modal ─────────────────────────────────────────────────────────
function NewTicketModal({ visible, user, onClose, onCreate }) {
  const { C } = useTheme();
  const [title,    setTitle]    = useState('');
  const [desc,     setDesc]     = useState('');
  const [category, setCategory] = useState('Bug');
  const [priority, setPriority] = useState('medium');
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');

  const handleCreate = async () => {
    if (!title.trim() || !desc.trim()) { setErr('Title and description are required.'); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    const ticket = {
      id: `tkt-${Date.now()}`,
      title: title.trim(), description: desc.trim(),
      category, priority, status: 'open',
      raised_by: user.id,
      raised_by_name: `${user.first_name} ${user.last_name}`,
      raised_by_role: user.role,
      facility: user.facility || 'Nairobi General Hospital',
      created_at: new Date().toISOString(),
      responses: [],
    };
    appendLog({
      staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
      module: 'Support', action: 'Ticket raised', detail: title.trim(), type: 'support',
    });
    setSaving(false);
    onCreate(ticket);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <ScrollView>
          <View style={{ minHeight: 500, justifyContent: 'flex-end' }}>
            <View style={[s.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={s.handle} />
              <Text style={[s.sheetTitle, { color: C.text }]}>Raise a support ticket</Text>
              <Text style={[s.sheetSub, { color: C.textMuted }]}>Your request goes directly to the IT Admin team.</Text>

              <Text style={[s.fieldLbl, { color: C.textMuted }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity key={c} onPress={() => setCategory(c)}
                    style={[s.pill, { backgroundColor: category === c ? C.primary : C.surface, borderColor: category === c ? C.primary : C.border, marginRight: 6 }]}>
                    <Text style={{ color: category === c ? '#fff' : C.textSec, fontSize: 11, fontWeight: '600' }}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[s.fieldLbl, { color: C.textMuted }]}>Priority</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {PRIORITIES.map(p => (
                  <TouchableOpacity key={p} onPress={() => setPriority(p)}
                    style={[s.pill, { flex: 1, backgroundColor: priority === p ? C.primary : C.surface, borderColor: priority === p ? C.primary : C.border }]}>
                    <Text style={{ color: priority === p ? '#fff' : C.textSec, fontSize: 11, fontWeight: '600', textAlign: 'center', textTransform: 'capitalize' }}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[s.fieldLbl, { color: C.textMuted }]}>Title *</Text>
              <TextInput
                value={title} onChangeText={v => { setTitle(v); setErr(''); }}
                placeholder="Brief description of the issue…"
                style={[s.inp, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                placeholderTextColor={C.textMuted}
              />

              <Text style={[s.fieldLbl, { color: C.textMuted }]}>Description *</Text>
              <TextInput
                value={desc} onChangeText={v => { setDesc(v); setErr(''); }}
                placeholder="Steps to reproduce, what you expected, what happened…"
                multiline numberOfLines={4}
                style={[s.textarea, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                placeholderTextColor={C.textMuted}
              />

              {err ? <Text style={[s.errTxt, { color: C.danger }]}>{err}</Text> : null}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <Btn label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} disabled={saving} />
                <Btn label={saving ? 'Submitting…' : 'Submit ticket'} onPress={handleCreate} loading={saving} style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Ticket detail modal ──────────────────────────────────────────────────────
function TicketDetailModal({ visible, ticket, user, onClose, onUpdate }) {
  const { C } = useTheme();
  const [response, setResponse] = useState('');
  const [saving,   setSaving]   = useState(false);

  if (!ticket) return null;
  const responder = canRespond(user?.role);

  const handleRespond = async () => {
    if (!response.trim()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 300));
    const newResp = {
      by: `${user.first_name} ${user.last_name}`,
      role: user.role,
      ts: 'Just now',
      text: response.trim(),
    };
    appendLog({
      staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
      module: 'Support', action: 'Ticket response added', detail: ticket.title, type: 'support',
    });
    setSaving(false);
    setResponse('');
    onUpdate(ticket.id, { responses: [...(ticket.responses || []), newResp] });
  };

  const handleStatus = async (newStatus) => {
    appendLog({
      staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
      module: 'Support', action: `Ticket ${newStatus}`, detail: ticket.title, type: 'support',
    });
    onUpdate(ticket.id, { status: newStatus });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={[s.sheet, { backgroundColor: C.card, borderColor: C.border, maxHeight: '85%' }]}>
          <View style={s.handle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={[s.sheetTitle, { color: C.text }]}>{ticket.title}</Text>
                <Text style={[s.sheetSub, { color: C.textMuted }]}>
                  By {ticket.raised_by_name} · {ticket.category}
                </Text>
              </View>
              <Badge label={STATUS_LABEL[ticket.status]} color={STATUS_COLOR[ticket.status] || 'primary'} />
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <Badge label={ticket.priority} color={PRIORITY_COLOR[ticket.priority] || 'warning'} />
              <Text style={{ fontSize: 11, color: C.textMuted }}>#{ticket.id}</Text>
            </View>

            <View style={[s.descBox, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={{ fontSize: 13, color: C.text, lineHeight: 19 }}>{ticket.description}</Text>
            </View>

            {/* Responses */}
            {(ticket.responses || []).length > 0 && (
              <View style={{ marginTop: 14 }}>
                <Text style={[s.fieldLbl, { color: C.textMuted }]}>Responses</Text>
                {ticket.responses.map((r, i) => (
                  <View key={i} style={[s.responseRow, { backgroundColor: r.role === 'it_admin' ? C.primaryLight : C.surface, borderColor: C.border }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontWeight: '700', fontSize: 12, color: C.text }}>{r.by}</Text>
                      <Text style={{ fontSize: 10, color: C.textMuted }}>{r.ts}</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: C.text, lineHeight: 18 }}>{r.text}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Response input — responders only */}
            {responder && ticket.status !== 'closed' && (
              <View style={{ marginTop: 14 }}>
                <Text style={[s.fieldLbl, { color: C.textMuted }]}>Add response</Text>
                <TextInput
                  value={response} onChangeText={setResponse}
                  placeholder="Type your response…"
                  multiline numberOfLines={3}
                  style={[s.textarea, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                  placeholderTextColor={C.textMuted}
                />
                <Btn label={saving ? 'Sending…' : 'Send response'} onPress={handleRespond} loading={saving} full style={{ marginTop: 6 }} />
              </View>
            )}

            {/* Status transitions — responders only */}
            {responder && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {ticket.status === 'open'        && <Btn label="Mark In Progress" size="sm" variant="secondary" onPress={() => handleStatus('in_progress')} />}
                {ticket.status === 'in_progress' && <Btn label="Mark Resolved"   size="sm" variant="success"   onPress={() => handleStatus('resolved')}    />}
                {ticket.status === 'resolved'    && <Btn label="Close Ticket"    size="sm" variant="ghost"     onPress={() => handleStatus('closed')}      />}
              </View>
            )}
          </ScrollView>
          <Btn label="Close" variant="ghost" onPress={onClose} full style={{ marginTop: 14 }} />
        </View>
      </View>
    </Modal>
  );
}

// ─── SupportTicketsScreen ─────────────────────────────────────────────────────
export function SupportTicketsScreen({ user, filter: propFilter }) {
  const { C } = useTheme();
  const [tickets,     setTickets]     = useState(MOCK_SUPPORT_TICKETS.map(t => ({ ...t })));
  const [filter,      setFilter]      = useState(propFilter || 'all');

  useEffect(() => { if (propFilter) setFilter(propFilter); }, [propFilter]);
  const [newModal,    setNewModal]    = useState(false);
  const [detailModal, setDetailModal] = useState({ visible: false, ticket: null });

  const isResponder = canRespond(user?.role);

  const visible = React.useMemo(
    () => tickets.filter(t => canSeeTicket(t, user)),
    [tickets, user]
  );

  // Apply tab filter on top of role-visibility filter
  const filtered = visible.filter(t => {
    if (filter === 'mine')     return t.raised_by === user?.id;
    if (filter === 'open')     return t.status === 'open';
    if (filter === 'progress') return t.status === 'in_progress';
    if (filter === 'resolved') return t.status === 'resolved' || t.status === 'closed';
    return true;
  });

  const handleUpdate = useCallback((id, patch) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    setDetailModal(d => d.ticket?.id === id ? { ...d, ticket: { ...d.ticket, ...patch } } : d);
  }, []);

  const FILTER_BTNS = [
    { id: 'all',      label: 'All' },
    { id: 'mine',     label: 'My tickets' },
    { id: 'open',     label: `Open (${visible?.filter?.(t => t.status === 'open').length ?? tickets.filter(t => t.status === 'open').length})` },
    { id: 'progress', label: 'In Progress' },
    { id: 'resolved', label: 'Resolved' },
  ];

  return (
    <ScreenContainer scroll>
      <View style={s.pageHead}>
        <View>
          <Text style={[s.pageTitle, { color: C.text }]}>Support tickets</Text>
          <Text style={[s.pageSub, { color: C.textMuted }]}>
            {user?.role === 'it_admin' ? 'All facilities — IT Admin view' :
           user?.role === 'hospital_admin' ? 'Your facility tickets' :
           'Raise issues to the IT Admin team'}
          </Text>
        </View>
        <Btn label="+ New ticket" size="sm" onPress={() => setNewModal(true)} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {FILTER_BTNS.map(f => (
          <Btn key={f.id} label={f.label} variant={filter === f.id ? 'primary' : 'ghost'}
            size="sm" onPress={() => setFilter(f.id)} style={{ marginRight: 8 }} />
        ))}
      </ScrollView>

      {filtered.length === 0 && (
        <View style={s.empty}>
          <Icon name="inbox" lib="feather" size={36} color={C.textMuted} />
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 10 }}>No tickets here</Text>
        </View>
      )}

      {filtered.map(t => (
        <Card key={t.id} hover onPress={() => setDetailModal({ visible: true, ticket: t })} style={s.ticketCard}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={[s.ticketIcon, { backgroundColor: `${C.primary}14` }]}>
              <Icon name="message-square" lib="feather" size={16} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <Text style={[s.ticketTitle, { color: C.text }]} numberOfLines={1}>{t.title}</Text>
              </View>
              <Text style={[s.ticketDesc, { color: C.textSec }]} numberOfLines={2}>{t.description}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Badge label={STATUS_LABEL[t.status]}   color={STATUS_COLOR[t.status] || 'primary'} />
                <Badge label={t.priority}               color={PRIORITY_COLOR[t.priority] || 'warning'} />
                <Badge label={t.category}               color="primary" />
                <Text style={{ fontSize: 10, color: C.textMuted, flex: 1 }}>by {t.raised_by_name}</Text>
                {(t.responses || []).length > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name="message-circle" lib="feather" size={11} color={C.textMuted} />
                    <Text style={{ fontSize: 10, color: C.textMuted }}>{t.responses.length}</Text>
                  </View>
                )}
              </View>
            </View>
            <Icon name="chevron-right" lib="feather" size={16} color={C.textMuted} />
          </View>
        </Card>
      ))}

      <NewTicketModal
        visible={newModal}
        user={user}
        onClose={() => setNewModal(false)}
        onCreate={t => setTickets(prev => [t, ...prev])}
      />
      <TicketDetailModal
        visible={detailModal.visible}
        ticket={detailModal.ticket}
        user={user}
        onClose={() => setDetailModal({ visible: false, ticket: null })}
        onUpdate={handleUpdate}
      />
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  pageHead:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  pageTitle:   { fontSize: 17, fontWeight: '800', marginBottom: 2 },
  pageSub:     { fontSize: 12 },
  ticketCard:  { marginBottom: 10, padding: 14 },
  ticketIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ticketTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  ticketDesc:  { fontSize: 12, lineHeight: 17 },
  empty:       { alignItems: 'center', paddingVertical: 48 },
  // Modal
  backdrop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:       { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, paddingBottom: 28 },
  handle:      { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  sheetTitle:  { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  sheetSub:    { fontSize: 12, marginBottom: 14 },
  fieldLbl:    { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  pill:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  inp:         { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 14 },
  textarea:    { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13, minHeight: 88, textAlignVertical: 'top', marginBottom: 8 },
  errTxt:      { fontSize: 12, marginBottom: 10 },
  descBox:     { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  responseRow: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
});
