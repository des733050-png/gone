import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Avatar } from '../../atoms/Avatar';
import { Icon } from '../../atoms/Icon';
import { ScreenContainer } from '../../organisms/ScreenContainer';
import { MOCK_MESSAGES } from '../../mock/data';

export function ChatScreen({ user }) {
  const { C } = useTheme();
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [input, setInput]       = useState('');
  const [typing, setTyping]     = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, [messages]);

  const send = async () => {
    const txt = input.trim();
    if (!txt) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((m) => [...m, { id: `m${Date.now()}`, from: 'rider', name: user.first_name, text: txt, time: now }]);
    setInput('');
    setTyping(true);
    await new Promise((r) => setTimeout(r, 1400));
    setTyping(false);
    setMessages((m) => [...m, {
      id: `m${Date.now()}`,
      from: 'patient',
      name: 'Faith Njoroge',
      text: 'Thanks! I\'ll be at the gate.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
  };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      {/* Patient header */}
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <Avatar name="Faith Njoroge" size={40} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={[styles.headerName, { color: C.text }]}>Faith Njoroge</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.onlineDot, { backgroundColor: C.success }]} />
            <Text style={[styles.headerSub, { color: C.success }]}>Patient · Online</Text>
          </View>
        </View>
        <Icon name="phone" lib="feather" size={20} color={C.primary} />
      </View>

      {/* Messages */}
      <ScrollView ref={scrollRef} style={[styles.messages, { backgroundColor: C.bg }]} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {messages.map((m) => {
          const mine = m.from === 'rider';
          return (
            <View key={m.id} style={[styles.msgRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
              {!mine && <Avatar name={m.name} size={28} />}
              <View style={[styles.bubble, {
                backgroundColor: mine ? C.warning : C.card,
                borderColor: mine ? 'transparent' : C.border,
                borderBottomRightRadius: mine ? 2 : 14,
                borderBottomLeftRadius: mine ? 14 : 2,
                marginLeft: mine ? 0 : 8,
                marginRight: mine ? 0 : 0,
              }]}>
                <Text style={{ color: mine ? '#fff' : C.text, fontSize: 14, lineHeight: 20 }}>{m.text}</Text>
                <Text style={{ color: mine ? 'rgba(255,255,255,0.7)' : C.textMuted, fontSize: 10, marginTop: 4, alignSelf: 'flex-end' }}>{m.time}</Text>
              </View>
            </View>
          );
        })}
        {typing && (
          <View style={[styles.msgRow, { justifyContent: 'flex-start' }]}>
            <Avatar name="Faith Njoroge" size={28} />
            <View style={[styles.bubble, { backgroundColor: C.card, borderColor: C.border, marginLeft: 8 }]}>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[0,1,2].map((i) => <View key={i} style={[styles.typingDot, { backgroundColor: C.textMuted }]} />)}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.inputRow, { backgroundColor: C.card, borderTopColor: C.border }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message…"
            placeholderTextColor={C.textMuted}
            style={[styles.textInput, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={send} style={[styles.sendBtn, { backgroundColor: C.warning }]}>
            <Icon name="send" lib="feather" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  headerName: { fontSize: 15, fontWeight: '700' },
  headerSub: { fontSize: 12, fontWeight: '600' },
  onlineDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  messages: { flex: 1 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  bubble: { maxWidth: '72%', borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  typingDot: { width: 6, height: 6, borderRadius: 3 },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, gap: 8 },
  textInput: { flex: 1, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  sendBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
