import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Icon } from '../../../atoms/Icon';
import { Btn } from '../../../atoms/Btn';
import { ScreenContainer } from '../../../organisms/ScreenContainer';

export function TrackOrderScreen() {
  const { C } = useTheme();

  return (
    <ScreenContainer scroll={false}>
      <Card style={styles.card}>
        <Text style={[styles.title, { color: C.text }]}>Order ORD-001</Text>
        <Text style={{ color: C.textMuted, fontSize: 13, marginBottom: 16 }}>
          Your medicines are on the way to Lavington, Nairobi.
        </Text>

        <View style={styles.timeline}>
          {[
            { label: 'Order placed', time: '1:55 PM', done: true },
            { label: 'Packed at pharmacy', time: '2:05 PM', done: true },
            { label: 'Rider picked up', time: '2:15 PM', done: true },
            { label: 'On the way', time: 'ETA ~12 mins', done: false },
          ].map((s, idx) => (
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
                {idx < 3 && <View style={[styles.stepLine, { borderColor: C.border }]} />}
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

        <View style={styles.footerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="bike" lib="mc" size={18} color={C.primary} style={{ marginRight: 6 }} />
            <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>Kevin (Rider)</Text>
          </View>
          <Btn label="Call Rider" variant="ghost" size="sm" />
        </View>
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
