import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Icon } from '../../../atoms/Icon';
import { Btn } from '../../../atoms/Btn';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { isPatientModuleIntegrated } from '../../../config/patientModules';
import { getOrderById, getOrders } from '../../../api';

export function TrackOrderScreen({ orderId }) {
  const { C } = useTheme();
  const integrated = isPatientModuleIntegrated('track');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!integrated) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError('');
        if (orderId) {
          const detail = await getOrderById(orderId);
          if (mounted) {
            setOrder(detail || null);
            setLoading(false);
          }
          return;
        }
        const items = await getOrders();
        const active = (items || []).find((item) => item.status === 'in_transit') || (items || [])[0] || null;
        if (mounted) setOrder(active);
      } catch (e) {
        if (mounted) setError(e?.message || 'Unable to load order tracking details.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [integrated, orderId]);

  return (
    <ScreenContainer scroll={false}>
      <Card style={styles.card}>
        {!integrated ? (
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.title, { color: C.text }]}>Track Order</Text>
            <Text style={{ color: C.textMuted, fontSize: 13 }}>
              Order tracking is not integrated yet in backend for this environment.
            </Text>
          </View>
        ) : null}
        {integrated && loading ? (
          <Text style={{ color: C.textMuted, fontSize: 13 }}>Loading tracking details...</Text>
        ) : null}
        {integrated && !loading && error ? (
          <Text style={{ color: C.danger, fontSize: 13 }}>{error}</Text>
        ) : null}
        {integrated && !loading && !error && !order ? (
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.title, { color: C.text }]}>No active order to track</Text>
            <Text style={{ color: C.textMuted, fontSize: 13 }}>
              Place an order to see delivery progress here.
            </Text>
          </View>
        ) : null}
        {integrated && !loading && !error && order ? (
          <>
            <Text style={[styles.title, { color: C.text }]}>
              Order {order.reference || order.id}
            </Text>
            <Text style={{ color: C.textMuted, fontSize: 13, marginBottom: 16 }}>
              {order.delivery_address
                ? `Delivery to ${order.delivery_address}.`
                : 'Your order is being prepared for delivery.'}
            </Text>

            <View style={styles.timeline}>
              {(order.tracking_steps || []).map((s, idx) => (
                <View style={styles.stepRow} key={s.label}>
                  <View style={styles.stepIconCol}>
                    <View
                      style={[
                        styles.stepIcon,
                        { backgroundColor: s.done ? C.success : C.border },
                      ]}
                    >
                      <Icon
                        name={s.done ? 'check' : 'clock'}
                        lib="feather"
                        size={12}
                        color={s.done ? '#fff' : C.textMuted}
                      />
                    </View>
                    {idx < (order.tracking_steps || []).length - 1 ? (
                      <View style={[styles.stepLine, { borderColor: C.border }]} />
                    ) : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: C.text,
                        fontWeight: '600',
                        fontSize: 13,
                      }}
                    >
                      {s.label}
                    </Text>
                    <Text style={{ color: C.textMuted, fontSize: 11 }}>{s.time}</Text>
                  </View>
                </View>
              ))}
            </View>
            {!order.tracking_steps ? (
              <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 10 }}>
                ETA {order.eta || '--'}
              </Text>
            ) : null}

            <View style={styles.footerRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="bike" lib="mc" size={18} color={C.primary} style={{ marginRight: 6 }} />
                <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>
                  {order.rider_name || 'Dispatch Team'}
                </Text>
              </View>
              <Btn label={order.rider_phone ? order.rider_phone : 'No rider phone'} variant="ghost" size="sm" />
            </View>
          </>
        ) : null}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  timeline: {
    marginTop: 8,
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  stepIconCol: {
    width: 26,
    alignItems: 'center',
  },
  stepIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    flex: 1,
    borderLeftWidth: 1,
    marginVertical: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
});
