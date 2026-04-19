// ─── screens/clinical/Availability/AvailabilityScreen.js ─────────────────────
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Btn } from '../../../atoms/Btn';
import { Icon } from '../../../atoms/Icon';
import { Avatar } from '../../../atoms/Avatar';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { useAvailability } from '../../../hooks/useAvailability';
import { DAYS } from '../../../constants/availability';
import { DayRow }      from './molecules/DayRow';
import { AddSlotModal } from './molecules/AddSlotModal';
import { s } from './styles';

export function AvailabilityScreen({ user }) {
  const { C }  = useTheme();
  const av = useAvailability(user);

  if (av.loading) {
    return (
      <ScreenContainer>
        <Text style={{ color: C.textMuted, textAlign: 'center', marginTop: 40 }}>
          Loading schedules…
        </Text>
      </ScreenContainer>
    );
  }
  if (av.error) {
    return (
      <ScreenContainer>
        <Text style={{ color: C.danger, textAlign: 'center', marginTop: 40 }}>{av.error}</Text>
      </ScreenContainer>
    );
  }

  // Admin / receptionist — doctor picker first
  if (!av.isDoctor && !av.activeDocId) {
    return (
      <ScreenContainer scroll>
        <Text style={{ fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 2 }}>
          {av.isRec ? 'Doctor schedules' : 'Availability management'}
        </Text>
        <Text style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>
          Select a doctor to view or manage their schedule
        </Text>
        {av.doctors.map(doc => {
          const sched = av.availability[doc.id];
          return (
            <Card key={doc.id} hover onPress={() => av.setSelectedDoc(doc.id)} style={s.docCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar name={`${doc.first_name} ${doc.last_name}`} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.docName, { color: C.text }]}>
                    {doc.first_name} {doc.last_name}
                  </Text>
                  <Text style={{ fontSize: 12, color: C.textMuted }}>{doc.specialty}</Text>
                  <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                    {(sched?.slots || []).length} slots · {(sched?.blocked_days || []).length} blocked days this week
                  </Text>
                </View>
                <Icon name="chevron-right" lib="feather" size={18} color={C.textMuted} />
              </View>
            </Card>
          );
        })}
        {!av.doctors.length && (
          <Text style={{ color: C.textMuted, marginTop: 8 }}>No doctor schedules available yet.</Text>
        )}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      {/* Back to doctor list */}
      {!av.isDoctor && (
        <TouchableOpacity
          onPress={() => av.setSelectedDoc(null)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}
        >
          <Icon name="arrow-left" lib="feather" size={16} color={C.primary} />
          <Text style={{ color: C.primary, fontWeight: '600', fontSize: 13 }}>All doctors</Text>
        </TouchableOpacity>
      )}

      <View style={s.schedHeader}>
        <View>
          <Text style={{ fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 2 }}>
            {av.isDoctor ? 'My availability' : (av.schedule?.doctor_name || 'Schedule')}
          </Text>
          <Text style={{ fontSize: 12, color: C.textMuted }}>This week · tap a day to add slots</Text>
        </View>
        <Btn label="+ Add slot" size="sm" onPress={() => av.setAddModalVis(true)} />
      </View>

      {/* Receptionist notice */}
      {av.isRec && (
        <View style={[s.infoBanner, { backgroundColor: C.warningLight, borderColor: C.warning }]}>
          <Icon name="alert-circle" lib="feather" size={13} color={C.warning} style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 12, color: C.warning, flex: 1 }}>
            Slots you add will be marked "set by receptionist". The doctor can override them.
          </Text>
        </View>
      )}

      {/* Day rows */}
      {av.schedule && DAYS.map(day => (
        <DayRow
          key={day}
          day={day}
          slots={av.schedule.slots || []}
          blocked={(av.schedule.blocked_days || []).includes(day)}
          onAddSlot={() => av.setAddModalVis(true)}
          onRemoveSlot={av.handleRemoveSlot}
          onToggleBlock={av.handleToggleBlock}
        />
      ))}

      <AddSlotModal
        visible={av.addModalVis}
        onClose={() => av.setAddModalVis(false)}
        onSave={av.handleAddSlot}
        doctorName={!av.isDoctor ? av.schedule?.doctor_name : null}
        existingSlots={av.schedule?.slots || []}
        setBy={av.setBy}
      />
    </ScreenContainer>
  );
}
