import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Btn } from '../../../../atoms/Btn';
import { Icon } from '../../../../atoms/Icon';
import { Input } from '../../../../atoms/Input';
import { ResponsiveModal } from '../../../../molecules/ResponsiveModal';
import { useTheme } from '../../../../theme/ThemeContext';
import { changePassword, logoutProvider } from '../../../../api';

function validateNewPassword(pw) {
  const s = String(pw || '');
  if (s.length < 8) return 'At least 8 characters.';
  if (!/\d/.test(s)) return 'Include at least one number.';
  if (!/[A-Z]/.test(s)) return 'Include at least one uppercase letter.';
  return '';
}

export function ChangePasswordModal({ visible, onClose, onSessionEnded }) {
  const { C } = useTheme();
  const onCloseRef = useRef(onClose);
  const onSessionEndedRef = useRef(onSessionEnded);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    onSessionEndedRef.current = onSessionEnded;
  }, [onSessionEnded]);

  const [current, setCurrent] = useState('');
  const [nextPw, setNextPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('form');
  const [logoutSec, setLogoutSec] = useState(5);

  useEffect(() => {
    if (!visible) return;
    setCurrent('');
    setNextPw('');
    setConfirm('');
    setShowCur(false);
    setShowNew(false);
    setShowCf(false);
    setSaving(false);
    setError('');
    setPhase('form');
    setLogoutSec(5);
  }, [visible]);

  const newErr = useMemo(() => (nextPw ? validateNewPassword(nextPw) : ''), [nextPw]);
  const sameAsCurrentErr = useMemo(() => {
    if (!nextPw || !current) return '';
    return nextPw === current ? 'New password must be different from your current password.' : '';
  }, [nextPw, current]);

  const confirmErr = useMemo(() => {
    if (!confirm) return '';
    return confirm === nextPw ? '' : 'Passwords do not match.';
  }, [confirm, nextPw]);

  const canSubmit =
    current.length > 0 &&
    !validateNewPassword(nextPw) &&
    !sameAsCurrentErr &&
    nextPw === confirm &&
    !saving;

  useEffect(() => {
    if (phase !== 'countdown') return undefined;
    let remaining = 5;
    setLogoutSec(remaining);
    const id = setInterval(() => {
      remaining -= 1;
      setLogoutSec(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(id);
        (async () => {
          try {
            const end = onSessionEndedRef.current;
            if (typeof end === 'function') {
              await end();
            } else {
              await logoutProvider();
            }
          } catch {
            /* still try to leave the modal */
          } finally {
            onCloseRef.current?.();
          }
        })();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      await changePassword({ currentPassword: current, newPassword: nextPw });
      setPhase('countdown');
      setLogoutSec(5);
    } catch (e) {
      setError(e?.message || 'Unable to update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveModal visible={visible} onClose={phase === 'form' ? onClose : () => {}}>
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: C.text }]}>Change password</Text>
          <Text style={{ color: C.textMuted, fontSize: 12 }}>
            {phase === 'form' ? 'Use a strong password you have not used here before.' : 'Signing you out…'}
          </Text>
        </View>
        {phase === 'form' ? (
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
            <Icon name="x" lib="feather" size={18} color={C.textMuted} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSide} />
        )}
      </View>

      {phase === 'form' ? (
        <>
          <ScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Input
              label="Current password"
              value={current}
              onChangeText={setCurrent}
              secureTextEntry={!showCur}
              onToggleSecure={() => setShowCur((v) => !v)}
              isSecureVisible={showCur}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Input
              label="New password"
              value={nextPw}
              onChangeText={setNextPw}
              secureTextEntry={!showNew}
              onToggleSecure={() => setShowNew((v) => !v)}
              isSecureVisible={showNew}
              autoCapitalize="none"
              autoCorrect={false}
              error={nextPw ? newErr || sameAsCurrentErr : ''}
            />
            <Input
              label="Confirm new password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showCf}
              onToggleSecure={() => setShowCf((v) => !v)}
              isSecureVisible={showCf}
              autoCapitalize="none"
              autoCorrect={false}
              error={confirm ? confirmErr : ''}
            />
          </ScrollView>
          {error ? <Text style={[styles.error, { color: C.danger }]}>{error}</Text> : null}
          <View style={styles.footer}>
            <Btn label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} disabled={saving} />
            <Btn
              label={saving ? 'Updating…' : 'Update password'}
              onPress={handleSubmit}
              style={{ flex: 1 }}
              disabled={!canSubmit}
              loading={saving}
            />
          </View>
        </>
      ) : (
        <View style={styles.countWrap}>
          <Icon name="check-circle" lib="feather" size={40} color={C.success} style={{ marginBottom: 12 }} />
          <Text style={[styles.success, { color: C.text }]}>Password updated.</Text>
          <Text style={{ color: C.textMuted, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
            {`Logging out in ${logoutSec}…`}
          </Text>
        </View>
      )}
    </ResponsiveModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  headerSide: { width: 24, height: 24 },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  scroll: { maxHeight: 420 },
  error: { fontSize: 12, marginTop: 8 },
  footer: { flexDirection: 'row', gap: 10, marginTop: 10 },
  countWrap: { alignItems: 'center', paddingVertical: 24 },
  success: { fontSize: 16, fontWeight: '700' },
});
