// ─── Sidebar.js ───────────────────────────────────────────────────────────────
// Sections (Clinical / Operations / Account) with collapsible groups and
// sub-items. Section headers and collapsible parents are driven by the
// NAV_TREE in MainShell.js — Sidebar receives the filtered tree and renders it.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, Animated,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Avatar } from '../atoms/Avatar';
import { Btn } from '../atoms/Btn';
import { Icon } from '../atoms/Icon';
import { ROLE_LABELS, ROLE_COLORS } from '../config/roles';

const ROLE_COLOR_MAP_KEYS = { primary: 'primary', purple: 'purple', warning: 'warning', success: 'success', accent: 'secondary' };

// ─── SectionLabel ─────────────────────────────────────────────────────────────
function SectionLabel({ label, C }) {
  return (
    <View style={styles.sectionLabelWrap}>
      <Text style={[styles.sectionLabel, { color: C.textMuted }]}>{label.toUpperCase()}</Text>
      <View style={[styles.sectionLine, { backgroundColor: C.divider }]} />
    </View>
  );
}

// ─── SubItem ──────────────────────────────────────────────────────────────────
function SubItem({ item, activeId, onPress, C, notifCount }) {
  const active = activeId === item.id;
  return (
    <TouchableOpacity
      style={[styles.subItem, { backgroundColor: active ? C.primaryLight : 'transparent' }]}
      onPress={() => onPress(item.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.subDot, { backgroundColor: active ? C.primary : C.border }]} />
      <Text
        style={[
          styles.subLabel,
          { color: active ? C.primary : C.textMuted, fontWeight: active ? '700' : '400' },
        ]}
        numberOfLines={1}
      >
        {item.label}
      </Text>
      {item.badge != null && item.badge > 0 && (
        <View style={[styles.badge, { backgroundColor: C.danger }]}>
          <Text style={styles.badgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
        </View>
      )}
      {notifCount > 0 && item.id === 'notifications' && (
        <View style={[styles.badge, { backgroundColor: C.danger }]}>
          <Text style={styles.badgeText}>{notifCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── NavItem (top-level, possibly with sub-items) ─────────────────────────────
function NavItem({ item, activeId, onPress, onClose, overlay, C, notifCount, openGroups, onToggleGroup }) {
  const hasSubs   = item.sub && item.sub.length > 0;
  const isOpen    = openGroups[item.id] || false;
  const isActive  = activeId === item.id || (hasSubs && item.sub.some(s => s.id === activeId));

  const handlePress = useCallback(() => {
    if (hasSubs) {
      onToggleGroup(item.id);
    } else {
      onPress(item.id);
      if (overlay && onClose) onClose();
    }
  }, [hasSubs, item.id, onPress, onToggleGroup, overlay, onClose]);

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.navItem,
          {
            backgroundColor: isActive && !hasSubs ? C.primaryLight : 'transparent',
            borderColor:     isActive && !hasSubs ? C.primaryMid   : 'transparent',
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Icon
          name={item.icon.name}
          lib={item.icon.lib}
          size={18}
          color={isActive ? C.primary : C.textSec}
          style={{ marginRight: 10 }}
        />
        <Text
          style={[
            styles.navLabel,
            { color: isActive ? C.primary : C.textSec, fontWeight: isActive ? '700' : '500' },
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Text>

        {/* Badge for notification count on the item itself */}
        {item.id === 'notifications' && notifCount > 0 && (
          <View style={[styles.badge, { backgroundColor: C.danger, marginRight: hasSubs ? 4 : 0 }]}>
            <Text style={styles.badgeText}>{notifCount > 99 ? '99+' : notifCount}</Text>
          </View>
        )}

        {hasSubs && (
          <Icon
            name={isOpen ? 'chevron-down' : 'chevron-right'}
            lib="feather"
            size={14}
            color={C.textMuted}
          />
        )}
      </TouchableOpacity>

      {hasSubs && isOpen && (
        <View style={styles.subList}>
          {item.sub.map(s => (
            <SubItem
              key={s.id}
              item={s}
              activeId={activeId}
              onPress={(id) => { onPress(id); if (overlay && onClose) onClose(); }}
              C={C}
              notifCount={s.id === 'notifications' ? notifCount : 0}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export function Sidebar({
  navTree,          // structured tree: [{ section, items: [NavItem] }]
  navItems,         // flat list fallback (used when navTree not passed)
  activeId,
  onChange,
  user,
  isDark,
  onToggleTheme,
  onLogout,
  open,
  onClose,
  overlay = false,
  notificationsUnread = 0,
}) {
  const { C } = useTheme();
  const [openGroups, setOpenGroups] = useState({});

  const roleColorKeys = { primary: C.primary, purple: C.purple || '#8B5CF6', warning: C.warning, success: C.success, accent: C.accent || C.secondary };
  const roleColor = roleColorKeys[ROLE_COLORS[user?.role]] || C.primary;

  const toggleGroup = useCallback((id) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  if (!open) return null;

  const containerStyle = overlay
    ? [styles.sidebar, styles.sidebarOverlay, { backgroundColor: C.navBg, borderColor: C.border }]
    : [styles.sidebar, { backgroundColor: C.navBg, borderColor: C.border }];

  // Support both navTree (new structured) and navItems (flat fallback)
  const tree = navTree || (navItems ? [{ section: null, items: navItems }] : []);

  return (
    <View style={containerStyle}>
      {/* ── Header ── */}
      <View style={[styles.sidebarHeader, { borderBottomColor: C.divider }]}>
        <Image source={require('../../assets/logo.png')} style={styles.logoImg} resizeMode="contain" />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.brand,    { color: C.primary   }]}>GONEP</Text>
          <Text style={[styles.brandSub, { color: C.textMuted }]}>Provider Portal</Text>
        </View>
        {overlay && onClose && (
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Icon name="x" lib="feather" size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── User pill ── */}
      <View style={[styles.userPill, { backgroundColor: `${roleColor}12`, borderColor: `${roleColor}30` }]}>
        <View style={[styles.userDot, { backgroundColor: roleColor }]} />
        <Text style={[styles.userPillText, { color: roleColor }]} numberOfLines={1}>
          {ROLE_LABELS[user?.role] || 'Provider'}
        </Text>
      </View>

      {/* ── Nav tree ── */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 8 }}
      >
        {tree.map((group, gi) => (
          <View key={gi}>
            {group.section && <SectionLabel label={group.section} C={C} />}
            {group.items.map(item => (
              <NavItem
                key={item.id}
                item={item}
                activeId={activeId}
                onPress={onChange}
                onClose={onClose}
                overlay={overlay}
                C={C}
                notifCount={notificationsUnread}
                openGroups={openGroups}
                onToggleGroup={toggleGroup}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      {/* ── Footer ── */}
      <View style={[styles.sidebarFooter, { borderTopColor: C.border }]}>
        <View style={styles.sidebarUserRow}>
          <Avatar name={`${user.first_name} ${user.last_name}`} size={36} />
          <View style={{ flex: 1, marginHorizontal: 8 }}>
            <Text style={[styles.footerName, { color: C.text }]} numberOfLines={1}>
              {user.first_name} {user.last_name}
            </Text>
            <Text style={[styles.footerEmail, { color: C.textMuted }]} numberOfLines={1}>
              {user.email}
            </Text>
          </View>
          <TouchableOpacity onPress={onToggleTheme} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Icon name={isDark ? 'sun' : 'moon'} lib="feather" size={16} color={C.textMuted} />
          </TouchableOpacity>
        </View>
        <Btn label="Sign Out" icon="log-out" onPress={onLogout} variant="ghost" size="sm" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    borderRightWidth: 1,
    flexDirection: 'column',
  },
  sidebarOverlay: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    zIndex: 20,
  },
  sidebarHeader: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  logoImg:  { width: 34, height: 34 },
  brand:    { fontWeight: '800', fontSize: 15 },
  brandSub: { fontSize: 10 },
  // Role pill under header
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  userDot:      { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  userPillText: { fontSize: 11, fontWeight: '700' },
  // Section
  sectionLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 14,
    gap: 8,
  },
  sectionLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  sectionLine:  { flex: 1, height: 1 },
  // Nav item
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginHorizontal: 6,
    marginVertical: 1,
    borderRadius: 10,
    borderWidth: 1,
  },
  navLabel: { flex: 1, fontSize: 13 },
  // Sub items
  subList: { paddingLeft: 10, marginBottom: 2 },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingLeft: 28,
    paddingRight: 12,
    marginHorizontal: 6,
    marginVertical: 1,
    borderRadius: 8,
  },
  subDot:   { width: 5, height: 5, borderRadius: 3, marginRight: 8, flexShrink: 0 },
  subLabel: { flex: 1, fontSize: 12 },
  // Badge
  badge:     { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  // Footer
  sidebarFooter:  { borderTopWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  sidebarUserRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  footerName:     { fontSize: 12, fontWeight: '700' },
  footerEmail:    { fontSize: 10 },
});
