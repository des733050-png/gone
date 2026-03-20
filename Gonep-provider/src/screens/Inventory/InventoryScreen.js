import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Icon } from '../../atoms/Icon';
import { ScreenContainer } from '../../organisms/ScreenContainer';
import { useInventory } from '../../hooks/useInventory';

export function InventoryScreen() {
  const { C } = useTheme();
  const { inventory } = useInventory();

  const statusColor = (s) => s === 'ok' ? 'success' : s === 'low' ? 'warning' : 'danger';
  const statusLabel = (s) => s === 'ok' ? 'In stock' : s === 'low' ? 'Low stock' : 'Out of stock';

  return (
    <ScreenContainer scroll>
      <View style={[styles.infoBox, { backgroundColor: C.primaryLight, borderColor: C.primaryMid }]}>
        <Icon name="store" lib="mc" size={14} color={C.primary} style={{ marginRight: 8 }} />
        <Text style={{ color: C.primary, fontSize: 12, flex: 1 }}>
          Medicines marked as "Listed on ecommerce" are visible and purchasable on the Gonep pharmacy website. Toggle to control availability.
        </Text>
      </View>

      {inventory.map(item => (
        <Card key={item.id} style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.icon, { backgroundColor: item.status === 'out' ? C.dangerLight : C.primaryLight }]}>
              <Icon name="package-variant" lib="mc" size={20} color={item.status === 'out' ? C.danger : C.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.name, { color: C.text }]}>{item.name}</Text>
              <Text style={[styles.sub,  { color: C.textMuted }]}>{item.category} · {item.unit}</Text>
              <Text style={[styles.stock,{ color: C.textSec }]}>
                Stock: <Text style={{ fontWeight: '700', color: item.status === 'out' ? C.danger : C.text }}>{item.stock}</Text>
                {' '}· Reorder at {item.reorder}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <Badge label={statusLabel(item.status)} color={statusColor(item.status)} />
            </View>
          </View>

          {/* Ecommerce toggle */}
          <View style={[styles.ecomRow, { borderTopColor: C.divider }]}>
            <View style={styles.ecomLabel}>
              <Icon name="store" lib="mc" size={14} color={item.ecommerce ? C.success : C.textMuted} style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 12, color: item.ecommerce ? C.success : C.textMuted, fontWeight: '600' }}>
                {item.ecommerce ? 'Listed on ecommerce' : 'Not listed on ecommerce'}
              </Text>
            </View>
            <Switch
              value={item.ecommerce}
              onValueChange={() => {}}
              trackColor={{ false: C.border, true: `${C.success}60` }}
              thumbColor={item.ecommerce ? C.success : C.textMuted}
            />
          </View>
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  infoBox:  { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16 },
  card:     { marginBottom: 10, padding: 14 },
  row:      { flexDirection: 'row', alignItems: 'center' },
  icon:     { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name:     { fontSize: 14, fontWeight: '700' },
  sub:      { fontSize: 12, marginTop: 2 },
  stock:    { fontSize: 12, marginTop: 4 },
  ecomRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1 },
  ecomLabel:{ flexDirection: 'row', alignItems: 'center' },
});
