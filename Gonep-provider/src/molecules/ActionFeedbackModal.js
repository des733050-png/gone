import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '../atoms/Icon';
import { SectionLoader } from '../atoms/SectionLoader';
import { ResponsiveModal } from './ResponsiveModal';
import { useTheme } from '../theme/ThemeContext';

export function ActionFeedbackModal({
  visible,
  type = 'loading', // loading | success | error
  title = '',
  message = '',
  onClose,
}) {
  const { C } = useTheme();

  const iconName = type === 'error' ? 'alert-circle' : 'check-circle';
  const iconColor = type === 'error' ? C.danger : C.success;
  const resolvedTitle = title || (type === 'loading' ? 'Processing...' : type === 'error' ? 'Something went wrong' : 'Done');

  return (
    <ResponsiveModal visible={visible} onClose={type === 'loading' ? undefined : onClose}>
      <View style={[styles.wrap, { backgroundColor: C.card, borderColor: C.border }]}>
        {type === 'loading' ? (
          <View style={styles.loaderWrap}>
            <SectionLoader label="" mode="section" />
          </View>
        ) : (
          <View style={[styles.stateIcon, { backgroundColor: `${iconColor}18` }]}>
            <Icon name={iconName} lib="feather" size={30} color={iconColor} />
          </View>
        )}

        <Text style={[styles.title, { color: C.text }]}>{resolvedTitle}</Text>
        {!!message && <Text style={[styles.message, { color: C.textMuted }]}>{message}</Text>}

        {type !== 'loading' && (
          <TouchableOpacity onPress={onClose} style={[styles.btn, { backgroundColor: C.primary }]}>
            <Text style={styles.btnText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>
    </ResponsiveModal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    minHeight: 280,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderWrap: { width: 120, height: 120, marginBottom: 14, alignItems: 'center', justifyContent: 'center' },
  stateIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  message: { fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: 360 },
  btn: { marginTop: 18, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 10 },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
