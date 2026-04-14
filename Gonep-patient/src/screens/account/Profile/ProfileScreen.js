import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Avatar } from '../../../atoms/Avatar';
import { Input } from '../../../atoms/Input';
import { Btn } from '../../../atoms/Btn';
import { ScreenContainer } from '../../../organisms/ScreenContainer';

export function ProfileScreen({ user, onUpdateUser }) {
  const { C } = useTheme();
  const [editing, setEditing] = useState(false);
  const [photoUri, setPhotoUri] = useState(user.avatar || null);
  const [pendingPhotoUri, setPendingPhotoUri] = useState(null);
  const [draft, setDraft] = useState({
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    date_of_birth: user.date_of_birth || '',
  });

  useEffect(() => {
    setDraft({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      date_of_birth: user.date_of_birth || '',
    });
    setPhotoUri(user.avatar || null);
    setPendingPhotoUri(null);
  }, [user]);

  const setField = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const save = () => {
    const nextAvatar = pendingPhotoUri || photoUri || user.avatar || null;
    if (onUpdateUser) {
      onUpdateUser({
        ...user,
        ...draft,
        avatar: nextAvatar || undefined,
      });
    }
    setPhotoUri(nextAvatar || null);
    setPendingPhotoUri(null);
    setEditing(false);
  };

  const pickImageFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setPendingPhotoUri(result.assets[0].uri);
      }
    } catch (e) {
      // ignore errors for now; UI-only behaviour
    }
  };

  const handleDrop = (event) => {
    if (Platform.OS !== 'web') return;
    event.preventDefault();
    const file = event?.nativeEvent?.dataTransfer?.files?.[0];
    if (file && file.type && file.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(file);
      setPendingPhotoUri(objectUrl);
    }
  };

  const handleDragOver = (event) => {
    if (Platform.OS !== 'web') return;
    event.preventDefault();
  };

  const resetDraftAndPhoto = () => {
    setDraft({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      date_of_birth: user.date_of_birth || '',
    });
    setPendingPhotoUri(null);
    setPhotoUri(user.avatar || null);
  };

  return (
    <ScreenContainer scroll>
      <Card style={styles.heroCard}>
        <Avatar
          name={`${user.first_name} ${user.last_name}`}
          size={68}
          uri={pendingPhotoUri || photoUri}
        />
        <Text style={[styles.name, { color: C.text }]}>
          {user.first_name} {user.last_name}
        </Text>
        <Text style={[styles.email, { color: C.textMuted }]}>{user.email}</Text>
        <View style={styles.badgeRow}>
          <Text style={[styles.badgeText, { color: C.textMuted }]}>Patient</Text>
          {user.blood_group ? (
            <Text style={[styles.badgeText, { color: C.textMuted }]}>
              Blood: {user.blood_group}
            </Text>
          ) : null}
        </View>
        <Btn
          label={editing ? 'Cancel' : '✏️ Edit Profile'}
          onPress={() => {
            if (editing) {
              resetDraftAndPhoto();
            }
            setEditing((e) => !e);
          }}
          variant={editing ? 'ghost' : 'secondary'}
          size="sm"
          style={{ marginTop: 12 }}
        />
      </Card>

      {editing ? (
        <Card>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Edit Profile</Text>
          <View style={[styles.row, styles.photoRow]}>
            <View style={{ alignItems: 'center', marginRight: 16 }}>
              <Avatar
                name={`${user.first_name} ${user.last_name}`}
                size={72}
                uri={pendingPhotoUri || photoUri}
              />
              <Text style={{ marginTop: 6, fontSize: 11, color: C.textMuted }}>
                {pendingPhotoUri ? 'Preview (not saved yet)' : 'Current photo'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Btn
                label="Choose image"
                size="sm"
                onPress={pickImageFromLibrary}
                style={{ marginBottom: 8 }}
              />
              <View
                style={[
                  styles.dropZone,
                  { borderColor: C.border, backgroundColor: C.surface },
                ]}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: C.textMuted,
                    textAlign: 'center',
                  }}
                >
                  Drag & drop an image here on web, or use “Choose image”.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <Input
              label="First Name"
              value={draft.first_name}
              onChangeText={(v) => setField('first_name', v)}
            />
          </View>
          <View style={styles.row}>
            <Input
              label="Last Name"
              value={draft.last_name}
              onChangeText={(v) => setField('last_name', v)}
            />
          </View>
          <View style={styles.row}>
            <Input
              label="Email"
              keyboardType="email-address"
              value={draft.email}
              onChangeText={(v) => setField('email', v)}
            />
          </View>
          <View style={styles.row}>
            <Input
              label="Phone"
              keyboardType="phone-pad"
              value={draft.phone}
              onChangeText={(v) => setField('phone', v)}
            />
          </View>
          <View style={styles.row}>
            <Input
              label="Date of Birth"
              placeholder="YYYY-MM-DD"
              value={draft.date_of_birth}
              onChangeText={(v) => setField('date_of_birth', v)}
            />
          </View>
          <View style={styles.row}>
            <Input
              label="Address"
              value={draft.address}
              onChangeText={(v) => setField('address', v)}
            />
          </View>
          <View
            style={{
              flexDirection: 'row',
              gap: 8,
              marginTop: 16,
            }}
          >
            <Btn label="Save Changes" onPress={save} style={{ flex: 1 }} />
            <Btn
              label="Cancel"
              onPress={() => {
                resetDraftAndPhoto();
                setEditing(false);
              }}
              variant="ghost"
            />
          </View>
        </Card>
      ) : (
        <Card>
          {[
            { label: 'Phone', value: user.phone },
            { label: 'Blood group', value: user.blood_group },
            { label: 'Age', value: user.age },
            {
              label: 'Date of Birth',
              value: user.date_of_birth || '—',
            },
            { label: 'Address', value: user.address },
          ].map((f, i, arr) => (
            <View
              key={f.label}
              style={[
                styles.fieldRow,
                i < arr.length - 1
                  ? { borderBottomWidth: 1, borderBottomColor: C.divider }
                  : null,
              ]}
            >
              <Text style={[styles.fieldLabel, { color: C.textMuted }]}>
                {f.label}
              </Text>
              <Text style={[styles.fieldValue, { color: C.text }]}>
                {f.value}
              </Text>
            </View>
          ))}
        </Card>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    alignItems: 'center',
    marginBottom: 14,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  row: {
    marginTop: 8,
  },
  photoRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dropZone: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  fieldRow: {
    paddingVertical: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
