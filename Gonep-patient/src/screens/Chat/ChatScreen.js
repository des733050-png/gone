import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Avatar } from '../../atoms/Avatar';
import { Btn } from '../../atoms/Btn';
import { ScreenContainer } from '../../organisms/ScreenContainer';

const MESSAGES = [
  { id: 'm1', from: 'doctor', text: 'Hi Faith, how are you feeling after your last visit?', time: '2:10 PM' },
  { id: 'm2', from: 'patient', text: 'I am feeling much better, just mild headaches in the evening.', time: '2:12 PM' },
  { id: 'm3', from: 'doctor', text: 'Great to hear. Please continue with the meds and drink plenty of water.', time: '2:13 PM' },
];

export function ChatScreen({ user }) {
  const { C } = useTheme();

  return (
    <ScreenContainer scroll={false}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Avatar name="Dr. Amina Wanjiku" size={32} />
          <View style={{ marginLeft: 8 }}>
            <Text style={[styles.title, { color: C.text }]}>Dr. Amina Wanjiku</Text>
            <Text style={{ color: C.textMuted, fontSize: 11 }}>General Physician · Typically replies in 5 min</Text>
          </View>
        </View>
        <ScrollView
          style={styles.messages}
          contentContainerStyle={{ paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {MESSAGES.map((m) => {
            const mine = m.from === 'patient';
            return (
              <View
                key={m.id}
                style={[
                  styles.messageRow,
                  { justifyContent: mine ? 'flex-end' : 'flex-start' },
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    {
                      backgroundColor: mine ? C.primary : C.card,
                      borderBottomRightRadius: mine ? 2 : 14,
                      borderBottomLeftRadius: mine ? 14 : 2,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: mine ? '#fff' : C.text,
                      fontSize: 13,
                    }}
                  >
                    {m.text}
                  </Text>
                  <Text
                    style={{
                      color: mine ? 'rgba(255,255,255,0.7)' : C.textMuted,
                      fontSize: 10,
                      marginTop: 4,
                      alignSelf: 'flex-end',
                    }}
                  >
                    {m.time}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
        <View style={styles.footer}>
          <Btn label="Send quick update" variant="secondary" size="sm" full />
        </View>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  messages: {
    flex: 1,
    marginVertical: 4,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  footer: {
    marginTop: 8,
  },
});

