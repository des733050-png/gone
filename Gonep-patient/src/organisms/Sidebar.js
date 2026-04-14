import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Avatar } from '../atoms/Avatar';
import { Btn } from '../atoms/Btn';
import { Badge } from '../atoms/Badge';
import { Icon } from '../atoms/Icon';

export function Sidebar({
  navItems,
  activeId,
  onChange,
  user,
  isDark,
  onToggleTheme,
  onLogout,
  open,
  onClose,
  overlay = false,
}) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();

  if (!open) return null;

  const containerStyle = overlay
    ? [
        styles.sidebar,
        styles.sidebarOverlay,
        { backgroundColor: C.navBg, borderColor: C.border },
      ]
    : [styles.sidebar, { backgroundColor: C.navBg, borderColor: C.border }];

  return (
    <View style={containerStyle}>
      <View style={[styles.sidebarHeader, { paddingTop: 14 + insets.top }]}>
      <Image
          source={require('../../assets/logo.png')}
          style={styles.logoImg}
          resizeMode="contain"
        />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.brand, { color: C.primary }]}>GONEP</Text>
          <Text style={[styles.brandSub, { color: C.textMuted }]}>Patient Portal</Text>
        </View>
        {overlay && onClose ? (
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            style={styles.closeBtn}
            activeOpacity={0.7}
          >
            <Icon name="x" lib="feather" size={20} color={C.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 12 }}
      >
        {navItems.map((item) => {
          const active = item.id === activeId;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.navItem,
                {
                  backgroundColor: active ? C.primaryLight : 'transparent',
                  borderColor: active ? C.primaryMid : 'transparent',
                },
              ]}
              onPress={() => {
                onChange(item.id);
                if (overlay && onClose) {
                  onClose();
                }
              }}
              activeOpacity={0.75}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Icon
                name={item.icon.name}
                lib={item.icon.lib}
                size={18}
                color={active ? C.primary : C.textSec}
                style={{ marginRight: 12 }}
              />
              <Text
                style={{
                  flex: 1,
                  color: active ? C.primary : C.textSec,
                  fontWeight: active ? '700' : '500',
                }}
              >
                {item.label}
              </Text>
              {item.id === 'notifications' && <Badge label="2" color="danger" />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.sidebarFooter, { borderTopColor: C.border }]}>
        <View style={styles.sidebarUserRow}>
          <Avatar name={`${user.first_name} ${user.last_name}`} size={38} />
          <View style={{ flex: 1, marginHorizontal: 8 }}>
            <Text
              style={{
                color: C.text,
                fontWeight: '700',
                fontSize: 13,
              }}
              numberOfLines={1}
            >
              {user.first_name} {user.last_name}
            </Text>
            <Text
              style={{ color: C.textMuted, fontSize: 11 }}
              numberOfLines={1}
            >
              {user.email}
            </Text>
          </View>
          <TouchableOpacity onPress={onToggleTheme}>
            <Icon
              name={isDark ? 'sun' : 'moon'}
              lib="feather"
              size={18}
              color={C.textMuted}
            />
          </TouchableOpacity>
        </View>
        <Btn
          label="Sign Out"
          icon="log-out"
          onPress={onLogout}
          variant="ghost"
          size="sm"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    borderRightWidth: 1,
  },
  sidebarOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 20,
  },
  sidebarHeader: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: {
    width: 36,
    height: 36,
  },
  brand: {
    fontWeight: '800',
    fontSize: 16,
  },
  brandSub: {
    fontSize: 10,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  sidebarFooter: {
    borderTopWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  sidebarUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
});

