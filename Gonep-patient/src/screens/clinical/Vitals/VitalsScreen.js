import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { Card } from '../../../atoms/Card';
import { Icon } from '../../../atoms/Icon';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { useVitals } from '../../../hooks/useVitals';
import {
  getPatientModuleIntegrationReason,
  isPatientModuleIntegrated,
} from '../../../config/patientModules';

export function VitalsScreen() {
  const { C } = useTheme();
  const { cardColumns } = useResponsive();
  const integrated = isPatientModuleIntegrated('vitals');
  const integrationReason = getPatientModuleIntegrationReason('vitals');
  const { vitals } = useVitals(integrated);

  const columns = Math.min(cardColumns, 3);
  const basis =
    columns === 3 ? '32%' : columns === 2 ? '48%' : '100%';
  const marginRight =
    columns === 3 ? '2%' : columns === 2 ? '4%' : 0;

  return (
    <ScreenContainer scroll contentContainerStyle={{ paddingBottom: 24 }}>
      {!integrated ? (
        <Card>
          <Text style={{ color: C.text, fontWeight: '700', marginBottom: 6 }}>
            Not integrated yet
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 12 }}>
            {integrationReason || 'Vitals API is not yet available on backend for this environment.'}
          </Text>
        </Card>
      ) : null}
      {integrated && vitals.length === 0 ? (
        <Card>
          <Text style={{ color: C.text, fontWeight: '700', marginBottom: 6 }}>No vitals yet</Text>
          <Text style={{ color: C.textMuted, fontSize: 12 }}>
            Your health measurements will appear here once recorded.
          </Text>
        </Card>
      ) : null}
      <View style={styles.grid}>
        {vitals.map((v, idx) => (
          <Card
            key={v.id}
            hover
            style={[
              styles.card,
              {
                flexBasis: basis,
                marginRight:
                  (idx + 1) % columns === 0 || columns === 1 ? 0 : marginRight,
              },
            ]}
          >
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: C.primaryLight }]}>
                <Icon name={v.icon.name} lib={v.icon.lib} size={18} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.textMuted }]}>{v.label}</Text>
                <Text style={[styles.value, { color: C.text }]}>{v.value}</Text>
                <Text style={{ color: C.success, fontSize: 11 }}>{v.trend}</Text>
              </View>
            </View>
          </Card>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  card: {
    padding: 14,
    marginHorizontal: 4,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
});
