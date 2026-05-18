/**
 * SpecializationsScreen
 *
 * Facility-admin view for managing the facility's specialization list.
 *
 * Flow:
 *  1. On mount: fetch master catalogue (getSpecializations) + facility's
 *     current assigned specializations (getFacilitySpecialties) + any pending
 *     requests (getSpecializationRequests).
 *  2. "Assign" panel: searchable dropdown of master-catalogue entries the
 *     facility hasn't assigned yet → POST specialization_id.
 *  3. "Request new" panel: if a specialization the facility needs doesn't
 *     exist in the catalogue, submit a SpecializationRequest → superadmin
 *     reviews → approved entries automatically appear in the master catalogue.
 *  4. Existing assigned list: each row shows name + an "Unassign" (delete)
 *     button.
 *  5. Pending requests sidebar: shows status chips for each outstanding request.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Modal,
  Platform,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { Card } from '../../../atoms/Card';
import { Btn } from '../../../atoms/Btn';
import { Icon } from '../../../atoms/Icon';
import {
  getFacilitySpecialties,
  deleteFacilitySpecialty,
  createFacilitySpecialty,
  getSpecializations,
  getSpecializationRequests,
  createSpecializationRequest,
} from '../../../api';

// ─── status chip colours ───────────────────────────────────────────────────────
const STATUS_COLOUR = {
  pending:  { bg: '#FFF3E0', text: '#E65100', border: '#FFCC80' },
  approved: { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' },
  rejected: { bg: '#FFEBEE', text: '#B71C1C', border: '#EF9A9A' },
};

function StatusChip({ status }) {
  const col = STATUS_COLOUR[status] || STATUS_COLOUR.pending;
  return (
    <View style={[sc.chip, { backgroundColor: col.bg, borderColor: col.border }]}>
      <Text style={[sc.chipText, { color: col.text }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

// ─── Searchable dropdown — platform-aware ─────────────────────────────────────
// Web: native <select> (no overflow/clipping issues, browser-searchable)
// Native: Modal overlay (renders at root, never clipped by parent overflow)
function SpecializationPicker({ options, value, onChange, placeholder }) {
  const { C } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, query]);

  const selected = options.find((o) => o.id === value);

  // ── Web: native <select> ──────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return React.createElement(
      'div',
      { style: { position: 'relative', width: '100%' } },
      React.createElement(
        'select',
        {
          value: value || '',
          onChange: (e) => onChange(e.target.value),
          style: {
            width: '100%',
            border: `1.5px solid ${value ? C.primary : C.border}`,
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 14,
            backgroundColor: C.surface,
            color: value ? C.text : C.textMuted,
            outline: 'none',
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238FA0BB' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
            paddingRight: 32,
          },
        },
        [
          React.createElement(
            'option',
            { key: '__placeholder', value: '', disabled: true },
            placeholder || 'Select specialization…'
          ),
          ...options.map((o) =>
            React.createElement('option', { key: o.id, value: o.id }, o.name)
          ),
        ]
      )
    );
  }

  // ── Native: Modal overlay ─────────────────────────────────────────────────
  return (
    <View>
      <TouchableOpacity
        style={[
          sc.pickerBtn,
          { borderColor: open ? C.primary : C.border, backgroundColor: C.surface },
        ]}
        onPress={() => { setOpen(true); setQuery(''); }}
        activeOpacity={0.8}
      >
        <Text
          style={[sc.pickerBtnText, { color: selected ? C.text : C.textMuted }]}
          numberOfLines={1}
        >
          {selected ? selected.name : (placeholder || 'Select specialization…')}
        </Text>
        <Icon name="chevron-down" lib="feather" size={15} color={C.textMuted} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        {/*
          Root fills the screen and dims it.
          Horizontal padding of 32px each side keeps the dialog
          well within device bounds regardless of screen width.
          The dialog itself has no explicit width — it stretches
          to fill the padded area, which is (screenW - 64)px max.
        */}
        <View style={[sc.modalRoot, { paddingHorizontal: Math.max(20, (screenW - 380) / 2) }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setOpen(false)}
          />

          <View style={[sc.modalSheet, { backgroundColor: C.card, borderColor: C.border }]}>
            {/* header row */}
            <View style={[sc.sheetHeader, { borderBottomColor: C.border }]}>
              <Text style={[sc.sheetTitle, { color: C.text }]}>Select specialization</Text>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="x" lib="feather" size={16} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {/* search bar */}
            <View style={[sc.searchRow, { borderBottomColor: C.border, backgroundColor: C.surface }]}>
              <Icon name="search" lib="feather" size={14} color={C.textMuted} style={{ marginRight: 6 }} />
              <TextInput
                autoFocus
                style={[sc.searchInput, { color: C.text }]}
                value={query}
                onChangeText={setQuery}
                placeholder="Search…"
                placeholderTextColor={C.textMuted}
              />
              {!!query && (
                <TouchableOpacity
                  onPress={() => setQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="x" lib="feather" size={13} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={[sc.noMatch, { color: C.textMuted }]}>No match</Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    sc.dropdownItem,
                    item.id === value && { backgroundColor: C.primaryLight || C.primary + '18' },
                  ]}
                  onPress={() => { onChange(item.id); setOpen(false); setQuery(''); }}
                >
                  <Text style={[sc.dropdownItemText, { color: C.text }]}>{item.name}</Text>
                  {item.id === value && (
                    <Icon name="check" lib="feather" size={13} color={C.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export function SpecializationsScreen() {
  const { C } = useTheme();

  // Remote data
  const [catalogue,  setCatalogue]  = useState([]);   // master list from backend
  const [assigned,   setAssigned]   = useState([]);   // this facility's FacilitySpecialty rows
  const [requests,   setRequests]   = useState([]);   // SpecializationRequest rows

  const [loading,    setLoading]    = useState(true);
  const [toast,      setToast]      = useState({ msg: '', ok: true });

  // Assign panel
  const [showAssign, setShowAssign] = useState(false);
  const [selId,      setSelId]      = useState('');
  const [assigning,  setAssigning]  = useState(false);

  // Unassign
  const [removing,   setRemoving]   = useState({});

  // Request-new panel
  const [showReq,    setShowReq]    = useState(false);
  const [reqName,    setReqName]    = useState('');
  const [reqReason,  setReqReason]  = useState('');
  const [reqSaving,  setReqSaving]  = useState(false);
  const [reqErrors,  setReqErrors]  = useState({});

  // ── helpers ────────────────────────────────────────────────────────────────
  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: '', ok: true }), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cat, asgn, reqs] = await Promise.all([
        getSpecializations(),
        getFacilitySpecialties(),
        getSpecializationRequests(),
      ]);
      setCatalogue(Array.isArray(cat)  ? cat  : []);
      setAssigned(Array.isArray(asgn) ? asgn : []);
      setRequests(Array.isArray(reqs) ? reqs : []);
    } catch {
      showToast('Failed to load specializations.', false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast.msg) return undefined;
    const t = setTimeout(() => setToast({ msg: '', ok: true }), 4000);
    return () => clearTimeout(t);
  }, [toast.msg]);

  // Catalogue entries not yet assigned to this facility
  const assignedSpecIds = useMemo(
    () => new Set(assigned.map((a) => a.specialization_id).filter(Boolean)),
    [assigned],
  );
  const unassigned = useMemo(
    () => catalogue.filter((c) => !assignedSpecIds.has(c.id)),
    [catalogue, assignedSpecIds],
  );

  // ── assign ─────────────────────────────────────────────────────────────────
  const handleAssign = async () => {
    if (!selId) return;
    setAssigning(true);
    try {
      await createFacilitySpecialty({ specialization_id: selId });
      setSelId('');
      setShowAssign(false);
      showToast('Specialization assigned.');
      await load();
    } catch (e) {
      const detail = e?.message || '';
      if (detail.includes('already')) {
        showToast('Already assigned to this facility.', false);
      } else {
        showToast('Failed to assign. Please try again.', false);
      }
    } finally {
      setAssigning(false);
    }
  };

  // ── unassign ───────────────────────────────────────────────────────────────
  const handleRemove = async (item) => {
    setRemoving((p) => ({ ...p, [item.id]: true }));
    try {
      await deleteFacilitySpecialty(item.id);
      showToast('Specialization unassigned.');
      await load();
    } catch (e) {
      const msg = e?.message || '';
      if (msg.includes('400') || msg.includes('doctors')) {
        showToast('Cannot remove: doctors are assigned to this specialization.', false);
      } else {
        showToast('Failed to remove. Please try again.', false);
      }
    } finally {
      setRemoving((p) => ({ ...p, [item.id]: false }));
    }
  };

  // ── request new specialization ─────────────────────────────────────────────
  const handleRequest = async () => {
    setReqErrors({});
    const name   = reqName.trim();
    const reason = reqReason.trim();
    const errs   = {};
    if (name.length < 2) errs.name = 'Name must be at least 2 characters.';
    if (Object.keys(errs).length) { setReqErrors(errs); return; }

    setReqSaving(true);
    try {
      await createSpecializationRequest({ name, reason });
      setReqName('');
      setReqReason('');
      setShowReq(false);
      showToast("Request submitted. We'll review it shortly.");
      await load();
    } catch (e) {
      const detail = e?.data || e?.message || '';
      if (typeof detail === 'object' && detail.name) {
        setReqErrors({ name: detail.name });
      } else if (String(detail).includes('already exists')) {
        setReqErrors({ name: 'Already in the catalogue — assign it from the list above.' });
      } else {
        showToast('Failed to submit request. Please try again.', false);
      }
    } finally {
      setReqSaving(false);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <ScreenContainer>
        <View style={sc.centered}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {!!toast.msg && (
        <View style={[sc.toast, {
          backgroundColor: toast.ok ? (C.successLight || '#E8F5E9') : (C.dangerLight || '#FFEBEE'),
          borderColor:     toast.ok ? (C.success     || '#388E3C') : (C.danger      || '#D32F2F'),
        }]}>
          <Icon
            name={toast.ok ? 'check-circle' : 'alert-circle'}
            lib="feather" size={15}
            color={toast.ok ? (C.success || '#388E3C') : (C.danger || '#D32F2F')}
          />
          <Text style={[sc.toastText, { color: toast.ok ? (C.success || '#388E3C') : (C.danger || '#D32F2F') }]}>
            {toast.msg}
          </Text>
        </View>
      )}

      {/* ── Section: Assigned specializations ─────────────────────────── */}
      <View style={sc.sectionHeader}>
        <View>
          <Text style={[sc.sectionTitle, { color: C.text }]}>Assigned specializations</Text>
          <Text style={[sc.sectionSub, { color: C.textMuted }]}>
            {assigned.length} active · visible to patients when searching doctors
          </Text>
        </View>
        <Btn
          label="+ Assign"
          size="sm"
          onPress={() => { setShowAssign(true); setSelId(''); }}
          disabled={unassigned.length === 0}
        />
      </View>

      {assigned.length === 0 ? (
        <Card style={[sc.emptyCard, { borderColor: C.border }]}>
          <Icon name="tag" lib="feather" size={32} color={C.textMuted} />
          <Text style={[sc.emptyText, { color: C.textMuted }]}>
            No specializations assigned yet.
          </Text>
          <Text style={[sc.emptyHint, { color: C.textMuted }]}>
            Click "Assign" to pick from the catalogue.
          </Text>
        </Card>
      ) : (
        assigned.map((item) => (
          <Card key={item.id} style={[sc.row, { borderColor: C.border }]}>
            <View style={[sc.dot, { backgroundColor: C.primary }]} />
            <Text style={[sc.rowName, { color: C.text }]} numberOfLines={1}>{item.name}</Text>
            <TouchableOpacity
              onPress={() => handleRemove(item)}
              disabled={!!removing[item.id]}
              style={sc.iconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {removing[item.id]
                ? <ActivityIndicator size="small" color={C.danger} />
                : <Icon name="trash-2" lib="feather" size={15} color={C.danger} />}
            </TouchableOpacity>
          </Card>
        ))
      )}

      {/* ── Assign panel (inline) ─────────────────────────────────────── */}
      {showAssign && (
        <Card style={[sc.panel, { borderColor: C.primary }]}>
          <Text style={[sc.panelTitle, { color: C.text }]}>Assign from catalogue</Text>
          {unassigned.length === 0 ? (
            <Text style={[sc.emptyHint, { color: C.textMuted }]}>
              All available specializations are already assigned.
            </Text>
          ) : (
            <>
              <SpecializationPicker
                options={unassigned}
                value={selId}
                onChange={setSelId}
                placeholder="Pick a specialization…"
              />
              <View style={sc.panelActions}>
                <Btn
                  label="Cancel"
                  variant="ghost"
                  size="sm"
                  onPress={() => { setShowAssign(false); setSelId(''); }}
                  style={{ flex: 1 }}
                />
                <Btn
                  label="Assign"
                  size="sm"
                  loading={assigning}
                  disabled={!selId || assigning}
                  onPress={handleAssign}
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
            </>
          )}

          {/* hint to request if not found */}
          <TouchableOpacity
            style={sc.requestHint}
            onPress={() => { setShowAssign(false); setShowReq(true); }}
          >
            <Icon name="plus-circle" lib="feather" size={13} color={C.primary} />
            <Text style={[sc.requestHintText, { color: C.primary }]}>
              Don't see what you need? Request a new specialization →
            </Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* ── Section: Pending requests ─────────────────────────────────── */}
      {requests.length > 0 && (
        <>
          <View style={[sc.sectionHeader, { marginTop: 24 }]}>
            <View>
              <Text style={[sc.sectionTitle, { color: C.text }]}>Specialization requests</Text>
              <Text style={[sc.sectionSub, { color: C.textMuted }]}>
                Requests sent to the GONEP admin team for review
              </Text>
            </View>
          </View>
          {requests.map((req) => (
            <Card key={req.id} style={[sc.reqRow, { borderColor: C.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[sc.rowName, { color: C.text }]}>{req.name}</Text>
                {!!req.reason && (
                  <Text style={[sc.reqReason, { color: C.textMuted }]} numberOfLines={2}>
                    {req.reason}
                  </Text>
                )}
                {req.status === 'rejected' && !!req.review_note && (
                  <Text style={[sc.reqNote, { color: C.danger || '#D32F2F' }]}>
                    Reason: {req.review_note}
                  </Text>
                )}
                {req.status === 'approved' && req.specialization && (
                  <Text style={[sc.reqNote, { color: C.success || '#388E3C' }]}>
                    Added to catalogue as "{req.specialization.name}" — assign it above.
                  </Text>
                )}
              </View>
              <StatusChip status={req.status} />
            </Card>
          ))}
        </>
      )}

      {/* ── Request new specialization ────────────────────────────────── */}
      <View style={[sc.sectionHeader, { marginTop: requests.length > 0 ? 16 : 24 }]}>
        <View>
          <Text style={[sc.sectionTitle, { color: C.text }]}>
            Can't find a specialization?
          </Text>
          <Text style={[sc.sectionSub, { color: C.textMuted }]}>
            Submit a request — once approved it appears in the catalogue for all facilities.
          </Text>
        </View>
        {!showReq && (
          <Btn
            label="Request new"
            size="sm"
            variant="outline"
            onPress={() => { setShowReq(true); setShowAssign(false); }}
          />
        )}
      </View>

      {showReq && (
        <Card style={[sc.panel, { borderColor: C.border }]}>
          <Text style={[sc.panelTitle, { color: C.text }]}>Request a new specialization</Text>

          <Text style={[sc.fieldLabel, { color: C.textMuted }]}>Specialization name *</Text>
          <TextInput
            style={[
              sc.input,
              { borderColor: reqErrors.name ? (C.danger || '#D32F2F') : C.border, color: C.text, backgroundColor: C.surface },
            ]}
            value={reqName}
            onChangeText={(v) => { setReqName(v); setReqErrors((p) => ({ ...p, name: undefined })); }}
            placeholder="e.g. Sports Medicine"
            placeholderTextColor={C.textMuted}
            autoFocus
          />
          {!!reqErrors.name && (
            <Text style={[sc.fieldError, { color: C.danger || '#D32F2F' }]}>{reqErrors.name}</Text>
          )}

          <Text style={[sc.fieldLabel, { color: C.textMuted, marginTop: 12 }]}>
            Reason / context (optional)
          </Text>
          <TextInput
            style={[
              sc.input, sc.textarea,
              { borderColor: C.border, color: C.text, backgroundColor: C.surface },
            ]}
            value={reqReason}
            onChangeText={setReqReason}
            placeholder="Why does your facility need this specialization?"
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={[sc.panelActions, { marginTop: 16 }]}>
            <Btn
              label="Cancel"
              variant="ghost"
              size="sm"
              onPress={() => { setShowReq(false); setReqName(''); setReqReason(''); setReqErrors({}); }}
              style={{ flex: 1 }}
            />
            <Btn
              label="Submit request"
              size="sm"
              loading={reqSaving}
              disabled={!reqName.trim() || reqSaving}
              onPress={handleRequest}
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>
        </Card>
      )}

    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const sc = StyleSheet.create({
  centered:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },

  toast:          { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 14 },
  toastText:      { flex: 1, fontSize: 13, fontWeight: '500' },

  sectionHeader:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle:   { fontSize: 15, fontWeight: '700' },
  sectionSub:     { fontSize: 12, marginTop: 2 },

  emptyCard:      { alignItems: 'center', gap: 8, paddingVertical: 36, borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, marginBottom: 8 },
  emptyText:      { fontSize: 14, fontWeight: '500' },
  emptyHint:      { fontSize: 12, textAlign: 'center' },

  row:            { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, padding: 12, borderWidth: 1, borderRadius: 10 },
  dot:            { width: 8, height: 8, borderRadius: 4 },
  rowName:        { flex: 1, fontSize: 14, fontWeight: '500' },
  iconBtn:        { padding: 6, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },

  panel:          { marginBottom: 16, padding: 16, borderWidth: 1.5, borderRadius: 10, gap: 12 },
  panelTitle:     { fontSize: 14, fontWeight: '700' },
  panelActions:   { flexDirection: 'row', gap: 8 },

  requestHint:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
  requestHintText:{ fontSize: 12, fontWeight: '500' },

  reqRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8, padding: 12, borderWidth: 1, borderRadius: 10 },
  reqReason:      { fontSize: 12, marginTop: 3 },
  reqNote:        { fontSize: 12, marginTop: 3, fontWeight: '500' },

  chip:           { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  chipText:       { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },

  fieldLabel:     { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldError:     { fontSize: 12, marginTop: 4 },
  input:          { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, marginTop: 4 },
  textarea:       { minHeight: 72 },

  // Picker trigger button
  pickerBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  pickerBtnText:    { flex: 1, fontSize: 14 },

  // Modal-based native picker — centered dialog, constrained by paddingHorizontal on root
  modalRoot:   { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet:  { borderRadius: 14, borderWidth: 1, maxHeight: 400, overflow: 'hidden' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  sheetTitle:  { fontSize: 14, fontWeight: '700' },
  searchRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  searchInput:      { flex: 1, fontSize: 13, padding: 0 },
  dropdownItem:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 },
  dropdownItemText: { fontSize: 14 },
  noMatch:          { textAlign: 'center', fontSize: 13, padding: 20, opacity: 0.6 },
});
