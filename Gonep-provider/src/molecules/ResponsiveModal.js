import React from 'react';
import { Modal, Platform, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

/** Optional `contentMaxHeight` caps panel height so children can scroll inside the viewport. */
export function ResponsiveModal({ visible, onClose, children, contentMaxHeight }) {
  const { C } = useTheme();
  const isWeb = Platform.OS === 'web';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[
            styles.container,
            isWeb ? styles.webContainer : styles.nativeContainer,
            { backgroundColor: C.card, borderColor: C.border },
            contentMaxHeight != null && {
              maxHeight: contentMaxHeight,
              overflow: 'hidden',
              minHeight: 0,
            },
          ]}
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  container: {
    borderWidth: 1,
    padding: 16,
    width: '100%',
    maxWidth: 720,
  },
  nativeContainer: {
    borderRadius: 16,
    paddingBottom: 24,
  },
  webContainer: {
    alignSelf: 'center',
    borderRadius: 16,
    paddingBottom: 16,
  },
});
