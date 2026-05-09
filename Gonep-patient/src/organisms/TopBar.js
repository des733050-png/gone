// FILE: src/organisms/TopBar.js
// COMPLETE REPLACEMENT
// Change: removed center title/subtitle. TopBar is now left-toggle | center-empty | right-actions only.

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { Avatar } from '../atoms/Avatar';
import { Icon } from '../atoms/Icon';

export function TopBar({
  user,
  onToggleSidebar,
  onShowNotifications,
  sidebarOpen,
  sidebarDocked: sidebarDockedProp,
  notificationsUnread = 0,
  onUserMenuSelect,
  userMenuOpen,
  setUserMenuOpen,
}) {
  const { C } = useTheme();
  const { sidebarDocked: sidebarDockedFromHook } = useResponsive();
  const insets = useSafeAreaInsets();
  const [hoveringMenu, setHoveringMenu] = useState(false);

  const isDocked =
    typeof sidebarDockedProp === 'boolean' ? sidebarDockedProp : sidebarDockedFromHook;
  const showSidebarToggle = !isDocked;

  useEffect(() => {
    if (!userMenuOpen || !setUserMenuOpen) return;
    const timeoutId = setTimeout(() => {
      setUserMenuOpen((open) => (!open ? open : hoveringMenu ? open : false));
    }, 30000);
    return () => clearTimeout(timeoutId);
  }, [userMenuOpen, hoveringMenu, setUserMenuOpen]);

  const fullName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User'
    : 'User';

  return (
    <View
      style={[
        styles.topBar,
        { paddingTop: insets.top, height: 56 + insets.top },
        { backgroundColor: C.navBg, borderBottomColor: C.border },
      ]}
    >
      {/* Left — sidebar toggle (mobile only) */}
      <View style={styles.leftArea}>
        {showSidebarToggle && !sidebarOpen ? (
          <TouchableOpacity
            onPress={onToggleSidebar}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Icon name="menu" lib="feather" size={22} color={C.textSec} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Center — empty intentionally */}
      <View style={styles.centerArea} />

      {/* Right — bell + avatar */}
      <View style={styles.rightArea}>
        <TouchableOpacity
          onPress={onShowNotifications}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <View>
            <Icon name="bell" lib="feather" size={20} color={C.textSec} />
            {notificationsUnread > 0 && (
              <View
                style={[
                  styles.unreadBadge,
                  { backgroundColor: C.danger, borderColor: C.navBg },
                ]}
              >
                <Text style={styles.unreadText}>
                  {notificationsUnread > 9 ? '9+' : notificationsUnread}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setUserMenuOpen && setUserMenuOpen((v) => !v)}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Avatar name={fullName} size={32} uri={user?.avatar} />
        </TouchableOpacity>
      </View>

      {/* Dropdown menu */}
      {userMenuOpen && (
        <View
          style={[
            styles.userMenu,
            {
              top: 56 + insets.top + 4,
              backgroundColor: C.card,
              borderColor: C.border,
            },
          ]}
          onMouseEnter={() => setHoveringMenu(true)}
          onMouseLeave={() => setHoveringMenu(false)}
        >
          {[
            { label: 'My Profile', icon: 'user',     key: 'profile',  color: C.text },
            { label: 'Settings',   icon: 'settings', key: 'settings', color: C.text },
            { label: 'Sign Out',   icon: 'log-out',  key: 'logout',   color: C.danger },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.userMenuItem}
              onPress={() => {
                setUserMenuOpen && setUserMenuOpen(false);
                onUserMenuSelect && onUserMenuSelect(item.key);
              }}
            >
              <Icon name={item.icon} lib="feather" size={14} color={item.color} />
              <Text style={[styles.menuLabel, { color: item.color }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  leftArea: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centerArea: {
    flex: 1,
  },
  rightArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -7,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  unreadText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  userMenu: {
    position: 'absolute',
    right: 16,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 4,
    minWidth: 160,
    zIndex: 40,
    elevation: 40,
  },
  userMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});
