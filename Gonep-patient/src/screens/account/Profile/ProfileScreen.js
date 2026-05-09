// FILE: src/screens/account/Profile/ProfileScreen.js
// DOB picker strategy:
//   iOS     → DateTimePicker spinner in a bottom-sheet modal
//   Android → DateTimePicker native dialog (display="default")
//   Web     → hidden <input type="date"> triggered programmatically via a ref

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Modal, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Avatar } from '../../../atoms/Avatar';
import { Input } from '../../../atoms/Input';
import { Btn } from '../../../atoms/Btn';
import { Icon } from '../../../atoms/Icon';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { updateCurrentUser } from '../../../api';

// Only import DateTimePicker on native — avoids web bundle issues
let DateTimePicker = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

// ─── Lock warning modal ───────────────────────────────────────────────────────
function LockWarningModal({ visible, onConfirm, onCancel }) {
  const { C } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={lockStyles.backdrop}>
        <View style={[lockStyles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={[lockStyles.iconWrap, { backgroundColor: C.warningLight }]}>
            <Icon name="alert-triangle" lib="feather" size={24} color={C.warning} />
          </View>
          <Text style={[lockStyles.title, { color: C.text }]}>This cannot be undone</Text>
          <Text style={[lockStyles.body, { color: C.textMuted }]}>
            Your name and date of birth can only be set once. Once saved, these fields will be
            permanently locked and cannot be changed.{'\n\n'}Are you sure the information is correct?
          </Text>
          <View style={lockStyles.actions}>
            <TouchableOpacity onPress={onCancel} style={[lockStyles.btn, { borderColor: C.border }]}>
              <Text style={{ color: C.text, fontWeight: '600' }}>Go back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={[lockStyles.btn, { backgroundColor: C.primary, borderColor: C.primary }]}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Yes, save permanently</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const lockStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card:     { width: '100%', maxWidth: 400, borderWidth: 1, borderRadius: 16, padding: 24, alignItems: 'center' },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title:    { fontSize: 17, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  body:     { fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  actions:  { flexDirection: 'row', gap: 10, width: '100%' },
  btn:      { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDateYYYYMMDD(value) {
  if (!value) return '';
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

function parseDobToDate(dobString) {
  if (!dobString) return null;
  const s = String(dobString).slice(0, 10);
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

// ─── Web DOB input ─────────────────────────────────────────────────────────────
function WebDobInput({ value, onSelect, onDismiss }) {
  const inputRef = useRef(null);
  const today = formatDateYYYYMMDD(new Date());

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const t = setTimeout(() => {
      try { el.showPicker(); } catch { el.click(); }
    }, 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <input
      ref={inputRef}
      type="date"
      defaultValue={value || ''}
      max={today}
      onBlur={onDismiss}
      onChange={e => { if (e.target.value) { onSelect(e.target.value); } }}
      style={{
        position: 'absolute',
        opacity: 0,
        pointerEvents: 'none',
        width: 1,
        height: 1,
        border: 'none',
        padding: 0,
        top: 0,
        left: 0,
      }}
    />
  );
}

// ─── iOS bottom-sheet picker ───────────────────────────────────────────────────
function IosDobPicker({ visible, value, onClose, onSelect }) {
  const { C } = useTheme();
  const pickerValue = parseDobToDate(value) || new Date(2000, 0, 1);
  if (!DateTimePicker || !visible) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={iosStyles.backdrop}>
        <View style={[iosStyles.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={iosStyles.header}>
            <Text style={[iosStyles.title, { color: C.text }]}>Date of Birth</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Text style={[iosStyles.done, { color: C.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display="spinner"
            maximumDate={new Date()}
            textColor={C.text}
            style={{ width: '100%' }}
            onChange={(_, selectedDate) => { if (selectedDate) onSelect(formatDateYYYYMMDD(selectedDate)); }}
          />
        </View>
      </View>
    </Modal>
  );
}

const iosStyles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:    { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, paddingBottom: 32 },
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title:    { fontSize: 16, fontWeight: '700' },
  done:     { fontSize: 16, fontWeight: '700' },
});

// ─── DobField ─────────────────────────────────────────────────────────────────
function DobField({ value, onChange }) {
  const { C } = useTheme();
  const [open, setOpen] = useState(false);
  const [webKey, setWebKey] = useState(0);

  const handlePress = () => {
    if (Platform.OS === 'web') {
      setWebKey(k => k + 1);
    }
    setOpen(true);
  };

  return (
    <View style={[styles.inputRow, { position: 'relative' }]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
        <View style={[styles.dobField, { borderColor: C.border, backgroundColor: C.inputBg }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.dobLabel, { color: C.textSec }]}>Date of Birth</Text>
            <Text style={[styles.dobValue, { color: value ? C.text : C.textMuted }]}>
              {value || 'Select date'}
            </Text>
            <Text style={[styles.dobHint, { color: C.textMuted }]}>
              Can only be set once — double-check before saving.
            </Text>
          </View>
          <Icon name="calendar" lib="feather" size={18} color={C.textMuted} />
        </View>
      </TouchableOpacity>

      {Platform.OS === 'web' && open && (
        <WebDobInput
          key={webKey}
          value={value}
          onSelect={v => { onChange(v); setOpen(false); }}
          onDismiss={() => setOpen(false)}
        />
      )}

      {Platform.OS === 'ios' && (
        <IosDobPicker
          visible={open}
          value={value}
          onClose={() => setOpen(false)}
          onSelect={v => onChange(v)}
        />
      )}

      {Platform.OS === 'android' && open && DateTimePicker && (
        <DateTimePicker
          value={parseDobToDate(value) || new Date(2000, 0, 1)}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(event, selectedDate) => {
            setOpen(false);
            if (event?.type !== 'dismissed' && selectedDate) {
              onChange(formatDateYYYYMMDD(selectedDate));
            }
          }}
        />
      )}
    </View>
  );
}

// ─── ProfileScreen ─────────────────────────────────────────────────────────────
export function ProfileScreen({ user, onUpdateUser }) {
  const { C } = useTheme();
  const [editing,         setEditing]        = useState(false);
  const [photoUri,        setPhotoUri]        = useState(user?.avatar || null);
  const [pendingPhotoUri, setPendingPhotoUri] = useState(null);
  const [saving,          setSaving]          = useState(false);
  const [saveError,       setSaveError]       = useState('');
  const [showLockWarning, setShowLockWarning] = useState(false);
  const [pendingPayload,  setPendingPayload]  = useState(null);

  // ── Optimistic lock state — seeded from server, then locked locally on first save ──
  // Once set to true here, these never go back to false in this session (or ever).
  const [nameLocked, setNameLocked] = useState(user?.name_locked === true);
  const [dobLocked,  setDobLocked]  = useState(user?.dob_locked  === true);

  const blankDraft = () => ({
    first_name:    user?.first_name    || '',
    last_name:     user?.last_name     || '',
    email:         user?.email         || '',
    phone:         user?.phone         || '',
    address:       user?.address       || '',
    date_of_birth: user?.date_of_birth || '',
  });

  const [draft, setDraft] = useState(blankDraft);

  useEffect(() => {
    setDraft(blankDraft());
    setPhotoUri(user?.avatar || null);
    setPendingPhotoUri(null);
    // Sync lock flags if the server ever updates them (but never unlock)
    if (user?.name_locked === true) setNameLocked(true);
    if (user?.dob_locked  === true) setDobLocked(true);
  }, [user]);

  const setField = (key, value) => setDraft(d => ({ ...d, [key]: value }));

  const resetDraft = () => {
    setDraft(blankDraft());
    setPendingPhotoUri(null);
    setPhotoUri(user?.avatar || null);
  };

  const attemptSave = () => {
    const willLockName = !nameLocked && (draft.first_name || draft.last_name);
    const willLockDob  = !dobLocked  && draft.date_of_birth;
    if (willLockName || willLockDob) {
      setPendingPayload({ draft, avatar: pendingPhotoUri || photoUri || user?.avatar || null });
      setShowLockWarning(true);
      return;
    }
    doSave(draft, pendingPhotoUri || photoUri || user?.avatar || null);
  };

  const doSave = async (draftToSave, avatarUrl) => {
    setSaving(true);
    setSaveError('');
    try {
      const payload = {
        first_name:    nameLocked ? undefined : draftToSave.first_name,
        last_name:     nameLocked ? undefined : draftToSave.last_name,
        email:         draftToSave.email,
        phone:         draftToSave.phone,
        address:       draftToSave.address,
        date_of_birth: dobLocked  ? undefined : draftToSave.date_of_birth,
      };
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      const updated = await updateCurrentUser(payload);

      // ── Optimistically lock fields on the frontend immediately after a
      //    successful save — prevents any re-editing regardless of server state.
      if (!nameLocked && (draftToSave.first_name || draftToSave.last_name)) {
        setNameLocked(true);
      }
      if (!dobLocked && draftToSave.date_of_birth) {
        setDobLocked(true);
      }

      if (onUpdateUser) onUpdateUser({ ...user, ...updated, avatar: avatarUrl || undefined });
      setPhotoUri(avatarUrl || null);
      setPendingPhotoUri(null);
      setEditing(false);
    } catch (error) {
      setSaveError(error?.message || 'Unable to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    try {
      // Native requires explicit permission before the picker will open
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setSaveError('Photo library access is required. Please allow it in Settings.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // stable across all Expo SDK versions
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (!result.canceled && result.assets?.[0]) {
        setPendingPhotoUri(result.assets[0].uri);
        setSaveError('');
      }
    } catch {
      setSaveError('Could not open photo library. Please try again.');
    }
  };

  // Web drag-and-drop via real DOM event listeners (Expo web ignores RN onDrop)
  const dropZoneRef = useRef(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || !editing) return;
    const el = dropZoneRef.current;
    if (!el) return;
    const onDragOver  = e => { e.preventDefault(); e.stopPropagation(); el.style.opacity = '0.65'; };
    const onDragLeave = e => { e.preventDefault(); el.style.opacity = '1'; };
    const onDrop = e => {
      e.preventDefault();
      e.stopPropagation();
      el.style.opacity = '1';
      const file = e.dataTransfer?.files?.[0];
      if (file?.type?.startsWith('image/')) {
        setPendingPhotoUri(URL.createObjectURL(file));
        setSaveError('');
      }
    };
    el.addEventListener('dragover',  onDragOver);
    el.addEventListener('dragleave', onDragLeave);
    el.addEventListener('drop',      onDrop);
    return () => {
      el.removeEventListener('dragover',  onDragOver);
      el.removeEventListener('dragleave', onDragLeave);
      el.removeEventListener('drop',      onDrop);
    };
  }, [editing]);

  return (
    <ScreenContainer scroll>
      {/* ── Hero card ── */}
      <Card style={styles.heroCard}>
        <Avatar
          name={`${user?.first_name || ''} ${user?.last_name || ''}`}
          size={68}
          uri={pendingPhotoUri || photoUri}
        />
        <Text style={[styles.name, { color: C.text }]}>{user?.first_name} {user?.last_name}</Text>
        <Text style={[styles.email, { color: C.textMuted }]}>{user?.email}</Text>
        <View style={styles.badgeRow}>
          <Text style={[styles.badgeText, { color: C.textMuted }]}>Patient</Text>
          {user?.blood_group ? (
            <Text style={[styles.badgeText, { color: C.textMuted }]}>Blood: {user.blood_group}</Text>
          ) : null}
        </View>
        <Btn
          label={editing ? 'Cancel' : 'Edit Profile'}
          icon={editing ? 'x' : 'edit-2'}
          onPress={() => { if (editing) resetDraft(); setEditing(e => !e); setSaveError(''); }}
          variant={editing ? 'ghost' : 'secondary'}
          size="sm"
          style={{ marginTop: 12 }}
        />
      </Card>

      {/* ── Edit form ── */}
      {editing ? (
        <Card>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Edit Profile</Text>

          {/* Photo */}
          <View style={styles.photoRow}>
            {/* Tap avatar directly to pick image */}
            <TouchableOpacity onPress={pickImage} activeOpacity={0.75} style={{ alignItems: 'center', marginRight: 16 }}>
              <View>
                <Avatar name={`${draft.first_name} ${draft.last_name}`} size={72} uri={pendingPhotoUri || photoUri} />
                <View style={[styles.avatarEditBadge, { backgroundColor: C.primary }]}>
                  <Icon name="camera" lib="feather" size={11} color="#fff" />
                </View>
              </View>
              <Text style={{ marginTop: 6, fontSize: 11, color: C.primary, fontWeight: '600' }}>
                {pendingPhotoUri ? 'Preview' : 'Tap to change'}
              </Text>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Btn label="Choose from library" size="sm" onPress={pickImage} style={{ marginBottom: 8 }} />

              {/* Web: real DOM div for drag-drop + hidden file input for click */}
              {Platform.OS === 'web' ? (
                <div
                  ref={dropZoneRef}
                  style={{
                    border: '1.5px dashed',
                    borderRadius: 10,
                    padding: '10px 8px',
                    textAlign: 'center',
                    fontSize: 11,
                    color: C.textMuted,
                    backgroundColor: C.surface,
                    cursor: 'pointer',
                    transition: 'opacity 0.15s',
                  }}
                  onClick={() => document.getElementById('__expo_photo_input__')?.click()}
                >
                  Drag & drop or click to upload
                  <input
                    id="__expo_photo_input__"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) { setPendingPhotoUri(URL.createObjectURL(file)); setSaveError(''); }
                      e.target.value = ''; // reset so same file can be re-selected
                    }}
                  />
                </div>
              ) : (
                <View style={[styles.dropZone, { borderColor: C.border, backgroundColor: C.surface }]}>
                  <Text style={{ fontSize: 11, color: C.textMuted, textAlign: 'center' }}>Tap above to choose a photo</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── V1: all personal fields are read-only; only photo is editable.
               The full editable versions (Input / DobField / lock-warning flow)
               are preserved above (DobField, IosDobPicker, WebDobInput,
               LockWarningModal, attemptSave, doSave) and will be wired back
               in V2. For now we render them as locked display rows. ── */}

          {/* Name */}
          <View style={styles.lockedField}>
            <Icon name="lock" lib="feather" size={13} color={C.textMuted} />
            <Text style={[styles.lockedText, { color: C.textMuted }]}>
              Name: {user?.first_name} {user?.last_name}
            </Text>
          </View>

          {/* Email */}
          <View style={styles.lockedField}>
            <Icon name="lock" lib="feather" size={13} color={C.textMuted} />
            <Text style={[styles.lockedText, { color: C.textMuted }]}>
              Email: {user?.email || '—'}
            </Text>
          </View>

          {/* Phone */}
          <View style={styles.lockedField}>
            <Icon name="lock" lib="feather" size={13} color={C.textMuted} />
            <Text style={[styles.lockedText, { color: C.textMuted }]}>
              Phone: {user?.phone || '—'}
            </Text>
          </View>

          {/* DOB */}
          <View style={styles.lockedField}>
            <Icon name="lock" lib="feather" size={13} color={C.textMuted} />
            <Text style={[styles.lockedText, { color: C.textMuted }]}>
              Date of Birth: {user?.date_of_birth || '—'}
            </Text>
          </View>

          {/* Address */}
          <View style={styles.lockedField}>
            <Icon name="lock" lib="feather" size={13} color={C.textMuted} />
            <Text style={[styles.lockedText, { color: C.textMuted }]}>
              Address: {user?.address || '—'}
            </Text>
          </View>

          <View style={styles.saveRow}>
            <Btn label={saving ? 'Saving…' : 'Save Photo'} onPress={() => doSave(draft, pendingPhotoUri || photoUri || user?.avatar || null)} loading={saving} disabled={saving} style={{ flex: 1 }} />
            <Btn label="Cancel" onPress={() => { resetDraft(); setEditing(false); }} variant="ghost" style={{ marginLeft: 8 }} />
          </View>

          {saveError ? <Text style={{ marginTop: 10, color: C.danger, fontSize: 12 }}>{saveError}</Text> : null}
        </Card>
      ) : (
        /* ── View mode ── */
        <Card>
          {[
            { label: 'Phone',         value: user?.phone },
            { label: 'Blood group',   value: user?.blood_group },
            { label: 'Age',           value: user?.age },
            { label: 'Date of Birth', value: user?.date_of_birth || '—' },
            { label: 'Address',       value: user?.address },
          ].map((f, i, arr) => (
            <View
              key={f.label}
              style={[styles.fieldRow, i < arr.length - 1 ? { borderBottomWidth: 1, borderBottomColor: C.divider } : null]}
            >
              <Text style={[styles.fieldLabel, { color: C.textMuted }]}>{f.label}</Text>
              <Text style={[styles.fieldValue, { color: C.text }]}>{f.value || '—'}</Text>
            </View>
          ))}
        </Card>
      )}

      <LockWarningModal
        visible={showLockWarning}
        onCancel={() => { setShowLockWarning(false); setPendingPayload(null); }}
        onConfirm={() => {
          setShowLockWarning(false);
          if (pendingPayload) { doSave(pendingPayload.draft, pendingPayload.avatar); setPendingPayload(null); }
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroCard:     { alignItems: 'center', marginBottom: 14 },
  name:         { fontSize: 20, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  email:        { fontSize: 13, marginBottom: 10 },
  badgeRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 4 },
  badgeText:    { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  photoRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dropZone:     { borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 10, justifyContent: 'center' },
  inputRow:     { marginTop: 4 },
  dobField:     { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dobLabel:     { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  dobValue:     { fontSize: 15, fontWeight: '600' },
  dobHint:      { fontSize: 11, marginTop: 6 },
  lockedField:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, marginBottom: 4 },
  lockedText:   { fontSize: 12, flex: 1 },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  saveRow:      { flexDirection: 'row', marginTop: 16 },
  fieldRow:     { paddingVertical: 12 },
  fieldLabel:   { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  fieldValue:   { fontSize: 14, fontWeight: '600' },
});