// ─── molecules/BottomSheet.js ─────────────────────────────────────────────────
// Reusable bottom sheet wrapping Modal with backdrop + scroll support.
// Usage: <BottomSheet visible={...} onClose={...}> ... </BottomSheet>
import React from 'react';
import { Modal, View, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function BottomSheet({ visible, onClose, children, scrollable = false, maxHeight = '85%' }) {
  const { C } = useTheme();

  const SheetContent = (
    <View style={[s.sheet, { backgroundColor: C.card, borderColor: C.border, maxHeight }]}>
      <View style={s.handle} />
      {children}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        {scrollable ? (
          <ScrollView>
            <View style={{ justifyContent: 'flex-end', minHeight: 500 }}>
              {SheetContent}
            </View>
          </ScrollView>
        ) : (
          SheetContent
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:    { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, borderWidth: 1 },
  handle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
});
