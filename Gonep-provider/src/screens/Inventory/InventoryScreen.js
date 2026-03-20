import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Btn } from '../../atoms/Btn';
import { Icon } from '../../atoms/Icon';
import { ScreenContainer } from '../../organisms/ScreenContainer';
import { useInventory } from '../../hooks/useInventory';

export function InventoryScreen() {
  const { C } = useTheme();
  const { inventory, loading } = useInventory();

  const statusColor = { ok: 'success', low: 'warning', out: 'danger' };
  const statusLabel = { ok: '✓ In Stock', low: '⚠ Low Stock', out: '✕ Out of Stock' };

  const outItems = inventory.filter((i) => i.status === 'out');
  const lowItems = inventory.filter((i) => i.status === 'low');

  return (
    <ScreenContainer scroll>
      {(outItems.length > 0 || lowItems.length > 0) && (
        <Card style={[styles.alertCard, { borderColor: `${C.warning}60`, backgroundColor: C.warningLight }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Icon name="alert-triangle" lib="feather" size={16} color={C.warning} style={{ marginRight: 6 }} />
            <Text style={[styles.alertTitle, { color: C.warning }]}>Stock Alerts</Text>
          </View>
          {outItems.map((i) => (
            <Text key={i.id} style={[styles.alertItem, { color: C.danger }]}>✕ {i.name} — OUT OF STOCK</Text>
          ))}
          {lowItems.map((i) => (
            <Text key={i.id} style={[styles.alertItem, { color: C.warning }]}>⚠ {i.name} — Only {i.stock} {i.unit} left</Text>
          ))}
        </Card>
      )}

      {/* Summary row */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total Items', value: inventory.length,                        color: C.primary, bg: C.primaryLight },
          { label: 'In Stock',    value: inventory.filter((i) => i.status === 'ok').length,   color: C.success, bg: C.successLight },
          { label: 'Low Stock',   value: lowItems.length,                         color: C.warning, bg: C.warningLight },
          { label: 'Out of Stock',value: outItems.length,                         color: C.danger,  bg: C.dangerLight },
        ].map((s) => (
          <Card key={s.label} style={[styles.statCard, { flex: 1 }]}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: C.textMuted }]}>{s.label}</Text>
          </Card>
        ))}
      </View>

      {inventory.map((item) => {
        const pct = Math.min((item.stock / (item.reorder * 3)) * 100, 100);
        return (
          <Card key={item.id} hover style={styles.itemCard}>
            <View style={styles.itemRow}>
              <View style={[styles.itemIcon, { backgroundColor: statusColor[item.status] === 'success' ? C.successLight : statusColor[item.status] === 'warning' ? C.warningLight : C.dangerLight }]}>
                <Icon name="pill" lib="mc" size={20} color={item.status === 'ok' ? C.success : item.status === 'low' ? C.warning : C.danger} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.itemName, { color: C.text }]}>{item.name}</Text>
                <Text style={[styles.itemCat, { color: C.textMuted }]}>{item.category}</Text>
                <View style={styles.itemMeta}>
                  <Text style={[styles.itemStock, { color: item.status === 'ok' ? C.success : item.status === 'low' ? C.warning : C.danger }]}>
                    {item.stock} {item.unit}
                  </Text>
                  <Text style={[styles.itemReorder, { color: C.textMuted }]}> · Reorder at {item.reorder}</Text>
                </View>
                {/* Stock bar */}
                <View style={[styles.barTrack, { backgroundColor: C.border }]}>
                  <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: item.status === 'ok' ? C.success : item.status === 'low' ? C.warning : C.danger }]} />
                </View>
              </View>
              <Badge label={statusLabel[item.status]} color={statusColor[item.status]} />
            </View>
            {(item.status === 'low' || item.status === 'out') && (
              <Btn label="Reorder Stock" variant="secondary" size="sm" style={{ marginTop: 10, alignSelf: 'flex-start' }}
                icon={<Icon name="refresh-cw" lib="feather" size={13} color={C.primary} />} />
            )}
          </Card>
        );
      })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  alertCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14 },
  alertTitle: { fontSize: 14, fontWeight: '700' },
  alertItem: { fontSize: 13, marginBottom: 2 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  statCard: { padding: 12, alignItems: 'center', minWidth: 70 },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', textAlign: 'center', marginTop: 2 },
  itemCard: { marginBottom: 10, padding: 14 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start' },
  itemIcon: { width: 44, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  itemCat: { fontSize: 11, marginBottom: 4 },
  itemMeta: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  itemStock: { fontSize: 13, fontWeight: '700' },
  itemReorder: { fontSize: 11 },
  barTrack: { height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 2 },
  barFill: { height: '100%', borderRadius: 3 },
});
