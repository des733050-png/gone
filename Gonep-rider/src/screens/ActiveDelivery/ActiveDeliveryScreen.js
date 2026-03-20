import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Btn } from '../../atoms/Btn';
import { Avatar } from '../../atoms/Avatar';
import { Icon } from '../../atoms/Icon';
import { ScreenContainer } from '../../organisms/ScreenContainer';
import { MOCK_ACTIVE_DELIVERY } from '../../mock/data';
import { completeDelivery } from '../../api';

const STEPS = [
  { label: 'Heading to Pharmacy', sub: 'Pick up the order', icon: 'store', lib: 'mc' },
  { label: 'Order Picked Up', sub: 'Collected from pharmacy', icon: 'package-variant', lib: 'mc' },
  { label: 'En Route to Patient', sub: 'On the way', icon: 'truck-fast', lib: 'mc' },
  { label: 'Delivered', sub: 'Order handed to patient', icon: 'check-circle', lib: 'feather' },
];

export function ActiveDeliveryScreen({ goTo }) {
  const { C } = useTheme();
  const [delivery] = useState(MOCK_ACTIVE_DELIVERY);
  const [step, setStep] = useState(delivery.step);
  const [completing, setCompleting] = useState(false);

  const advance = () => { if (step < 3) setStep((s) => s + 1); };

  const handleComplete = async () => {
    setCompleting(true);
    await completeDelivery(delivery.id);
    setCompleting(false);
    if (goTo) goTo('tripHistory');
  };

  const isComplete = step === 3;

  return (
    <ScreenContainer scroll>
      {/* Order header */}
      <Card style={[styles.headerCard, { borderColor: isComplete ? `${C.success}80` : `${C.warning}60` }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.orderId, { color: C.primary }]}>{delivery.order_id}</Text>
            <Text style={[styles.deliveryId, { color: C.textMuted }]}>{delivery.id}</Text>
          </View>
          <Badge label={isComplete ? '✅ Delivered' : '🛵 In Progress'} color={isComplete ? 'success' : 'warning'} />
        </View>
        <Text style={[styles.payout, { color: C.success }]}>Payout: {delivery.payout}</Text>
      </Card>

      {/* Map placeholder */}
      <Card style={[styles.mapCard, { backgroundColor: C.primaryLight, borderColor: C.border }]}>
        <View style={styles.mapInner}>
          {/* Fake road lines */}
          {[[20,30],[50,60],[80,40],[35,70],[65,25]].map(([x,y],i)=>(
            <View key={i} style={[styles.mapDot, { left: `${x}%`, top: `${y}%`, backgroundColor: C.border }]} />
          ))}
          <View style={styles.mapCenter}>
            <View style={[styles.riderPin, { backgroundColor: C.warning }]}>
              <Icon name="bike" lib="mc" size={22} color="#fff" />
            </View>
            <Text style={[styles.mapLabel, { color: C.textSec }]}>Live GPS Tracking</Text>
            <Text style={[styles.mapSub, { color: C.textMuted }]}>(Google Maps in production)</Text>
          </View>
        </View>
      </Card>

      {/* Patient info */}
      <Card style={styles.patientCard}>
        <View style={styles.patientRow}>
          <Avatar name={delivery.patient} size={44} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.patientName, { color: C.text }]}>{delivery.patient}</Text>
            <Text style={[styles.patientPhone, { color: C.textMuted }]}>{delivery.phone}</Text>
            <Text style={[styles.patientAddress, { color: C.primary }]}>📍 {delivery.address}</Text>
          </View>
          <View style={{ gap: 6 }}>
            <Btn label="📞" variant="secondary" size="sm" />
            <Btn label="💬" variant="ghost" size="sm" />
          </View>
        </View>

        <View style={[styles.itemsBox, { backgroundColor: C.bg }]}>
          <Text style={[styles.itemsTitle, { color: C.textSec }]}>Items to deliver:</Text>
          {delivery.items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <Icon name="pill" lib="mc" size={14} color={C.primary} style={{ marginRight: 6 }} />
              <Text style={[{ color: C.text, fontSize: 13 }]}>{item}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Progress steps */}
      <Card style={styles.stepsCard}>
        <Text style={[styles.stepsTitle, { color: C.text }]}>Delivery Progress</Text>
        {STEPS.map((s, i) => {
          const done    = i < step;
          const current = i === step;
          return (
            <View key={s.label} style={styles.stepRow}>
              <View style={styles.stepLeft}>
                <View style={[styles.stepCircle, { backgroundColor: done || current ? (done ? C.success : C.warning) : C.border }]}>
                  <Icon name={done ? 'check' : s.icon} lib={done ? 'feather' : s.lib} size={14} color={done || current ? '#fff' : C.textMuted} />
                </View>
                {i < STEPS.length - 1 && <View style={[styles.stepLine, { backgroundColor: done ? C.success : C.border }]} />}
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepLabel, { color: done || current ? C.text : C.textMuted, fontWeight: current ? '700' : '500' }]}>{s.label}</Text>
                <Text style={[styles.stepSub, { color: current ? C.warning : C.textMuted }]}>{current ? 'In progress…' : done ? 'Completed ✓' : s.sub}</Text>
              </View>
            </View>
          );
        })}
      </Card>

      {/* CTA */}
      {!isComplete ? (
        <View style={styles.ctaRow}>
          <Btn label={`Mark as: ${STEPS[Math.min(step + 1, 3)].label}`} onPress={advance} full size="lg"
            icon={<Icon name="arrow-right" lib="feather" size={18} color="#fff" />} />
        </View>
      ) : (
        <Btn label={completing ? 'Completing…' : 'Complete Delivery'} onPress={handleComplete}
          full size="lg" loading={completing} variant="success"
          icon={<Icon name="check-circle" lib="feather" size={18} color="#fff" />} />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerCard: { marginBottom: 12, padding: 14, borderWidth: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  orderId: { fontSize: 16, fontWeight: '800' },
  deliveryId: { fontSize: 11 },
  payout: { fontSize: 14, fontWeight: '700' },
  mapCard: { height: 180, borderRadius: 14, marginBottom: 12, overflow: 'hidden', borderWidth: 1 },
  mapInner: { flex: 1, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  mapDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
  mapCenter: { alignItems: 'center' },
  riderPin: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  mapLabel: { fontSize: 12 },
  mapSub: { fontSize: 10 },
  patientCard: { marginBottom: 12 },
  patientRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  patientName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  patientPhone: { fontSize: 12, marginBottom: 2 },
  patientAddress: { fontSize: 12, fontWeight: '600' },
  itemsBox: { borderRadius: 10, padding: 10 },
  itemsTitle: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  stepsCard: { marginBottom: 14 },
  stepsTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  stepRow: { flexDirection: 'row', marginBottom: 0 },
  stepLeft: { alignItems: 'center', marginRight: 14 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepLine: { width: 2, flex: 1, minHeight: 20, marginVertical: 2 },
  stepContent: { flex: 1, paddingBottom: 18 },
  stepLabel: { fontSize: 14, marginBottom: 2 },
  stepSub: { fontSize: 12 },
  ctaRow: { marginBottom: 8 },
});
