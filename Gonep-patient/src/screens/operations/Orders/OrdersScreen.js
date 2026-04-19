import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Badge } from '../../../atoms/Badge';
import { Btn } from '../../../atoms/Btn';
import { Icon } from '../../../atoms/Icon';
import { getOrders, reorderOrder } from '../../../api';
import { ScreenContainer } from '../../../organisms/ScreenContainer';

export function OrdersScreen({ onTrackOrder, onReorderOrder }) {
  const { C } = useTheme();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await getOrders();
        if (mounted) {
          setOrders(data || []);
        }
      } catch (e) {
        if (mounted) setError(e?.message || 'Unable to load orders.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const statusConfig = {
    in_transit: { label: 'In Transit', color: 'warning' },
    delivered: { label: 'Delivered', color: 'success' },
  };

  return (
    <ScreenContainer scroll contentContainerStyle={{ paddingBottom: 24 }}>
      {!loading && orders.length === 0 ? (
        <Card style={styles.card}>
          <Text style={{ color: C.text, fontWeight: '700', marginBottom: 4 }}>No orders yet</Text>
          <Text style={{ color: C.textMuted, fontSize: 12 }}>
            Your medicine orders will appear here after checkout.
          </Text>
        </Card>
      ) : null}
      {error ? <Text style={{ color: C.danger, fontSize: 12, marginBottom: 10 }}>{error}</Text> : null}
      {orders.map((o) => {
        const conf = statusConfig[o.status] || statusConfig.in_transit;
        return (
          <Card key={o.id} hover style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={[styles.orderId, { color: C.text }]}>{o.reference || o.id}</Text>
              <Badge label={conf.label} color={conf.color} />
            </View>
            <Text style={{ color: C.textSec, fontSize: 13, marginBottom: 8 }}>
              {o.items.map((i) => `${i.name} x${i.qty}`).join(', ')}
            </Text>
            <View style={styles.metaRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="clock" lib="feather" size={14} color={C.textMuted} style={{ marginRight: 4 }} />
                <Text style={{ color: C.textMuted, fontSize: 12 }}>{o.placedAt}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="truck-delivery" lib="mc" size={16} color={C.success} style={{ marginRight: 4 }} />
                <Text style={{ color: C.success, fontSize: 12, fontWeight: '600' }}>{o.eta}</Text>
              </View>
            </View>
            <View style={styles.actions}>
              <Btn
                label="Track"
                variant="secondary"
                size="sm"
                onPress={() => {
                  if (onTrackOrder) onTrackOrder(o.id);
                }}
              />
              <Btn
                label="Reorder"
                variant="ghost"
                size="sm"
                style={styles.actionBtn}
                onPress={async () => {
                  const created = await reorderOrder(o.id);
                  if (created) {
                    setOrders((prev) => [created, ...prev]);
                    if (onReorderOrder) onReorderOrder(created.id);
                  }
                }}
              />
            </View>
          </Card>
        );
      })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontWeight: '700',
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  actionBtn: {
    marginLeft: 8,
  },
});
