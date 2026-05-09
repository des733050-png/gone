import React, { useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from '../atoms/Icon';

export const PAGINATION_PAGE_SIZE_OPTIONS = [10, 20, 40, 50, 100];

function clampPage(page, totalPages) {
  if (page < 1) return 1;
  if (page > totalPages) return totalPages;
  return page;
}

export function PaginationControls({
  totalItems = 0,
  currentPage = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'items',
}) {
  const { C } = useTheme();
  const [showSizePicker, setShowSizePicker] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = clampPage(currentPage, totalPages);

  const range = useMemo(() => {
    if (totalItems === 0) return { start: 0, end: 0 };
    const start = (safePage - 1) * pageSize + 1;
    const end = Math.min(totalItems, safePage * pageSize);
    return { start, end };
  }, [totalItems, safePage, pageSize]);

  return (
    <View style={[styles.wrap, { borderColor: C.border, backgroundColor: C.card }]}>
      <View style={styles.topRow}>
        <Text style={[styles.meta, { color: C.textMuted }]}>
          {range.start}-{range.end} of {totalItems} {itemLabel}
        </Text>
        <Text style={[styles.meta, { color: C.textMuted }]}>
          Page {safePage} / {totalPages}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.sizeRow}>
          <Text style={[styles.rowsLabel, { color: C.textMuted }]}>Rows per page</Text>
          <TouchableOpacity
            onPress={() => setShowSizePicker(true)}
            style={[styles.filterBtn, { borderColor: C.border, backgroundColor: C.surface }]}
          >
            <Icon name="filter" lib="feather" size={12} color={C.textMuted} />
            <Text style={{ color: C.text, fontSize: 11, fontWeight: '700' }}>{pageSize}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.navRow}>
          <TouchableOpacity
            disabled={safePage <= 1}
            onPress={() => onPageChange?.(safePage - 1)}
            style={[
              styles.navBtn,
              { borderColor: C.border, backgroundColor: C.surface, opacity: safePage <= 1 ? 0.5 : 1 },
            ]}
          >
            <Text style={{ color: C.text, fontWeight: '600', fontSize: 12 }}>Prev</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={safePage >= totalPages}
            onPress={() => onPageChange?.(safePage + 1)}
            style={[
              styles.navBtn,
              { borderColor: C.border, backgroundColor: C.surface, opacity: safePage >= totalPages ? 0.5 : 1 },
            ]}
          >
            <Text style={{ color: C.text, fontWeight: '600', fontSize: 12 }}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showSizePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSizePicker(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowSizePicker(false)}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalCard, { borderColor: C.border, backgroundColor: C.card }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>Rows per page</Text>
            {PAGINATION_PAGE_SIZE_OPTIONS.map((size) => {
              const active = size === pageSize;
              return (
                <TouchableOpacity
                  key={size}
                  onPress={() => {
                    onPageSizeChange?.(size);
                    setShowSizePicker(false);
                  }}
                  style={[
                    styles.modalOption,
                    {
                      borderColor: active ? C.primary : C.border,
                      backgroundColor: active ? C.primaryLight : C.surface,
                    },
                  ]}
                >
                  <Text style={{ color: active ? C.primary : C.text, fontSize: 12, fontWeight: '700' }}>
                    {size}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 4, marginBottom: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#00000012', paddingBottom: 8 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  meta: { fontSize: 11, fontWeight: '600' },
  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  rowsLabel: { fontSize: 11, fontWeight: '700' },
  filterBtn: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navBtn: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 52, alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 280, borderWidth: 1, borderRadius: 12, padding: 12 },
  modalTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  modalOption: { borderWidth: 1.5, borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginBottom: 6 },
});
