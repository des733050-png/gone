import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Avatar } from '../../../atoms/Avatar';
import { Btn } from '../../../atoms/Btn';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { useChatThread } from '../../../hooks/useChatThread';
import {
  getPatientModuleIntegrationReason,
  isPatientModuleIntegrated,
} from '../../../config/patientModules';

export function ChatScreen() {
  const { C } = useTheme();
  const integrated = isPatientModuleIntegrated('chat');
  const integrationReason = getPatientModuleIntegrationReason('chat');
  const { messages } = useChatThread(integrated);

  return (
    <ScreenContainer scroll={false}>
      <Card style={styles.card}>
        {!integrated ? (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: C.text, fontWeight: '700', marginBottom: 4 }}>
              Not integrated yet
            </Text>
            <Text style={{ color: C.textMuted, fontSize: 12 }}>
              {integrationReason || 'Chat backend endpoint is not available in this environment.'}
            </Text>
          </View>
        ) : null}
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
          {messages.map((m) => {
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
          {integrated && messages.length === 0 ? (
            <Text style={{ color: C.textMuted, fontSize: 12, textAlign: 'center', marginTop: 12 }}>
              No messages yet.
            </Text>
          ) : null}
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
