import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { Avatar } from '../atoms/Avatar';
import { Icon } from '../atoms/Icon';
import { ROLE_LABELS, ROLE_COLORS } from '../config/roles';

export function TopBar({
  meta, user, onToggleSidebar, onShowNotifications,
  sidebarOpen, sidebarDocked: sidebarDockedProp,
  notificationsUnread = 0, onUserMenuSelect,
  userMenuOpen, setUserMenuOpen,
}) {
  const { C } = useTheme();
  const { sidebarDocked: sidebarDockedFromHook } = useResponsive();
  const insets = useSafeAreaInsets();
  const isDocked = typeof sidebarDockedProp === 'boolean' ? sidebarDockedProp : sidebarDockedFromHook;
  const showSidebarToggle = !isDocked;
  const [hoveringMenu, setHoveringMenu] = useState(false);

  const roleColorMap = {
    primary: C.primary, purple: C.purple || '#8B5CF6',
    warning: C.warning, success: C.success, accent: C.accent || C.secondary,
  };
  const roleColor = roleColorMap[ROLE_COLORS[user?.role]] || C.primary;

  useEffect(() => {
    if (!userMenuOpen || !setUserMenuOpen) return;
    const id = setTimeout(() => {
      setUserMenuOpen(open => (open && !hoveringMenu ? false : open));
    }, 30000);
    return () => clearTimeout(id);
  }, [userMenuOpen, hoveringMenu, setUserMenuOpen]);

  return (
    <View
      style={[
        styles.topBar,
        { paddingTop: insets.top, height: 56 + insets.top },
        { backgroundColor: C.navBg, borderBottomColor: C.border },
      ]}
    >
      <View style={styles.leftArea}>
        {showSidebarToggle && !sidebarOpen ? (
          <TouchableOpacity onPress={onToggleSidebar}>
            <Icon name="menu" lib="feather" size={22} color={C.textSec} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.titleArea}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {meta.icon && (
            <Icon name={meta.icon.name} lib={meta.icon.lib} size={18} color={C.primary} style={{ marginRight: 6 }} />
          )}
          <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }} numberOfLines={1}>
            {meta.title}
          </Text>
        </View>
        {meta.sub ? <Text style={{ color: C.textMuted, fontSize: 12 }}>{meta.sub}</Text> : null}
      </View>

      <View style={styles.rightArea}>
        <TouchableOpacity onPress={onShowNotifications} style={{ marginRight: 10 }}>
          <View style={{ position: 'relative' }}>
            <Icon name="bell" lib="feather" size={20} color={C.textSec} />
            {notificationsUnread > 0 && (
              <View style={[styles.unreadDot, { backgroundColor: C.danger, borderColor: C.navBg }]}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                  {notificationsUnread > 9 ? '9+' : notificationsUnread}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setUserMenuOpen && setUserMenuOpen(v => !v)}>
          <Avatar name={`${user.first_name} ${user.last_name}`} size={32} />
        </TouchableOpacity>
      </View>

      {userMenuOpen && (
        <View
          style={[
            styles.userMenu,
            { top: 56 + insets.top + 4, zIndex: 40, elevation: 40 },
            { backgroundColor: C.card, borderColor: C.border },
          ]}
          onMouseEnter={() => setHoveringMenu(true)}
          onMouseLeave={() => setHoveringMenu(false)}
        >
          {/* User info header */}
          <View style={[styles.menuHeader, { borderBottomColor: C.divider }]}>
            <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
              {user.first_name} {user.last_name}
            </Text>
            <View style={[styles.menuRolePill, { backgroundColor: `${roleColor}18` }]}>
              <Text style={{ color: roleColor, fontSize: 10, fontWeight: '700' }}>
                {ROLE_LABELS[user?.role] || 'Provider'}
              </Text>
            </View>
            <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
              {user.email}
            </Text>
          </View>

          {[
            { label: 'My Profile', key: 'profile',  icon: 'user'     },
            { label: 'Settings',   key: 'settings', icon: 'settings' },
          ].map(item => (
            <TouchableOpacity
              key={item.key}
              style={styles.userMenuItem}
              onPress={() => { setUserMenuOpen && setUserMenuOpen(false); onUserMenuSelect && onUserMenuSelect(item.key); }}
            >
              <Icon name={item.icon} lib="feather" size={14} color={C.textSec} style={{ marginRight: 8 }} />
              <Text style={{ color: C.text, fontSize: 13 }}>{item.label}</Text>
            </TouchableOpacity>
          ))}

          <View style={[styles.menuDivider, { backgroundColor: C.divider }]} />

          <TouchableOpacity
            style={styles.userMenuItem}
            onPress={() => { setUserMenuOpen && setUserMenuOpen(false); onUserMenuSelect && onUserMenuSelect('logout'); }}
          >
            <Icon name="log-out" lib="feather" size={14} color={C.danger} style={{ marginRight: 8 }} />
            <Text style={{ color: C.danger, fontSize: 13, fontWeight: '600' }}>Sign out</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar:       { borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  leftArea:     { width: 40, alignItems: 'flex-start', justifyContent: 'center' },
  titleArea:    { flex: 1, alignItems: 'center' },
  rightArea:    { width: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  unreadDot:    { position: 'absolute', top: -4, right: -8, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  userMenu:     {
    position: 'absolute', right: 16, borderRadius: 14, borderWidth: 1,
    paddingVertical: 4, minWidth: 220, zIndex: 100,
    ...Platform.select({
      web:     { boxShadow: '0 8px 24px rgba(0,0,0,0.1)' },
      default: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
    }),
  },
  menuHeader:    { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  menuRolePill:  { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  userMenuItem:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9 },
  menuDivider:   { height: 1, marginVertical: 4, marginHorizontal: 8 },
});
