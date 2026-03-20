import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { Avatar } from '../atoms/Avatar';
import { Icon } from '../atoms/Icon';

export function TopBar({
  meta,
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

  const isDocked =
    typeof sidebarDockedProp === 'boolean'
      ? sidebarDockedProp
      : sidebarDockedFromHook;
  const showSidebarToggle = !isDocked;
  const [hoveringMenu, setHoveringMenu] = useState(false);

  useEffect(() => {
    if (!userMenuOpen || !setUserMenuOpen) return;

    const timeoutId = setTimeout(() => {
      // Auto-close if the user is not hovering over the menu
      setUserMenuOpen((open) => {
        if (!open) return open;
        return hoveringMenu ? open : false;
      });
    }, 30000);

    return () => clearTimeout(timeoutId);
  }, [userMenuOpen, hoveringMenu, setUserMenuOpen]);

  return (
    <View
      style={[
        styles.topBar,
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
            <Icon
              name={meta.icon.name}
              lib={meta.icon.lib}
              size={18}
              color={C.primary}
              style={{ marginRight: 6 }}
            />
          )}
          <Text
            style={{
              color: C.text,
              fontSize: 16,
              fontWeight: '700',
            }}
            numberOfLines={1}
          >
            {meta.title}
          </Text>
        </View>
        {meta.sub ? (
          <Text style={{ color: C.textMuted, fontSize: 11 }}>
            {meta.sub}
          </Text>
        ) : null}
      </View>

      <View style={styles.rightArea}>
        <TouchableOpacity
          onPress={onShowNotifications}
          style={{ marginRight: 10 }}
        >
          <View style={{ position: 'relative' }}>
            <Icon name="bell" lib="feather" size={20} color={C.textSec} />
            {notificationsUnread > 0 && (
              <View
                style={[
                  styles.unreadDot,
                  { backgroundColor: C.danger, borderColor: C.navBg },
                ]}
              >
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                  {notificationsUnread > 9 ? '9+' : notificationsUnread}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            setUserMenuOpen &&
            setUserMenuOpen((v) => !v)
          }
        >
          <Avatar name={`${user.first_name} ${user.last_name}`} size={32} />
        </TouchableOpacity>
      </View>
      {userMenuOpen && (
        <View
          style={[
            styles.userMenu,
            { backgroundColor: C.card, borderColor: C.border },
          ]}
          onMouseEnter={() => setHoveringMenu(true)}
          onMouseLeave={() => setHoveringMenu(false)}
        >
          <TouchableOpacity
            style={styles.userMenuItem}
            onPress={() => {
              setUserMenuOpen && setUserMenuOpen(false);
              onUserMenuSelect && onUserMenuSelect('profile');
            }}
          >
            <Text style={{ color: C.text, fontSize: 13 }}>My Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.userMenuItem}
            onPress={() => {
              setUserMenuOpen && setUserMenuOpen(false);
              onUserMenuSelect && onUserMenuSelect('settings');
            }}
          >
            <Text style={{ color: C.text, fontSize: 13 }}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.userMenuItem}
            onPress={() => {
              setUserMenuOpen && setUserMenuOpen(false);
              onUserMenuSelect && onUserMenuSelect('logout');
            }}
          >
            <Text style={{ color: C.danger, fontSize: 13, fontWeight: '600' }}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: 56,
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
  titleArea: {
    flex: 1,
    alignItems: 'center',
  },
  rightArea: {
    width: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  unreadDot: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  userMenu: {
    position: 'absolute',
    top: 56,
    right: 16,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 4,
    minWidth: 160,
    boxShadow: '0px 4px 8px rgba(0,0,0,0.08)',
    elevation: 3,
  },
  userMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});

