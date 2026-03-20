import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { Sidebar } from '../organisms/Sidebar';
import { TopBar } from '../organisms/TopBar';
import { PageSeo } from '../seo/PageSeo';
import { getAllowedPages } from '../config/roles';
import { getNotifications } from '../api';

import { DashboardScreen }    from './Dashboard';
import { AppointmentsScreen } from './Appointments';
import { PharmacyScreen }     from './Pharmacy';
import { EMRScreen }          from './EMR';
import { LabScreen }          from './Lab';
import { BillingScreen }      from './Billing';
import { InventoryScreen }    from './Inventory';
import { NotificationsScreen }from './Notifications';
import { ProfileScreen }      from './Profile';
import { SettingsScreen }     from './Settings';
import { StaffScreen }        from './Staff';

// Full nav definition — filtered per role at render time
const ALL_NAV_ITEMS = [
  { id: 'home',          label: 'Dashboard',        icon: { lib: 'feather', name: 'home'             } },
  { id: 'appointments',  label: 'Appointments',      icon: { lib: 'feather', name: 'calendar'         } },
  { id: 'pharmacy',      label: 'Pharmacy & Rx',     icon: { lib: 'mc',      name: 'pill'             } },
  { id: 'emr',           label: 'EMR',               icon: { lib: 'mc',      name: 'file-document-outline' } },
  { id: 'lab',           label: 'Lab Results',       icon: { lib: 'mc',      name: 'flask-outline'    } },
  { id: 'billing',       label: 'Billing',           icon: { lib: 'feather', name: 'dollar-sign'      } },
  { id: 'inventory',     label: 'Inventory',         icon: { lib: 'mc',      name: 'package-variant'  } },
  { id: 'staff',         label: 'Staff & Roles',     icon: { lib: 'feather', name: 'users'            } },
  { id: 'notifications', label: 'Notifications',     icon: { lib: 'feather', name: 'bell'             } },
  { id: 'profile',       label: 'My Profile',        icon: { lib: 'feather', name: 'user'             } },
  { id: 'settings',      label: 'Settings',          icon: { lib: 'feather', name: 'settings'         } },
];

export function MainShell({ user, onLogout, onUpdateUser }) {
  const { C, toggle, isDark } = useTheme();
  const { sidebarDocked }     = useResponsive();

  // Filter nav items based on user role
  const allowedPages = useMemo(() => getAllowedPages(user.role), [user.role]);
  const navItems     = useMemo(() => ALL_NAV_ITEMS.filter(n => allowedPages.includes(n.id)), [allowedPages]);

  // Default to first allowed page
  const defaultPage  = allowedPages[0] || 'home';
  const [page, setPage] = useState(defaultPage);

  const [sidebarOpen,        setSidebarOpen]        = useState(sidebarDocked);
  const [notificationsUnread,setNotificationsUnread] = useState(0);
  const [userMenuOpen,       setUserMenuOpen]        = useState(false);

  useEffect(() => { setSidebarOpen(sidebarDocked); }, [sidebarDocked]);

  useEffect(() => {
    let m = true;
    getNotifications()
      .then((items) => { if (m) setNotificationsUnread((items || []).filter((n) => !n.read).length); })
      .catch(() => {});
    return () => { m = false; };
  }, []);

  // Safe navigation — only go to pages this role can access
  const goTo = (pageId) => {
    if (allowedPages.includes(pageId)) setPage(pageId);
  };

  const pageMeta = useMemo(() => ({
    home:          { title: 'Dashboard',       sub: `${user.first_name} ${user.last_name}${user.specialty ? ' · ' + user.specialty : ''}`, icon: ALL_NAV_ITEMS[0].icon },
    appointments:  { title: 'Appointments',    sub: 'Patient scheduling',           icon: ALL_NAV_ITEMS[1].icon },
    pharmacy:      { title: 'Pharmacy & Rx',   sub: 'Prescription dispatch queue',  icon: ALL_NAV_ITEMS[2].icon },
    emr:           { title: 'EMR',             sub: 'Electronic medical records',   icon: ALL_NAV_ITEMS[3].icon },
    lab:           { title: 'Lab Results',     sub: 'Results and critical flags',   icon: ALL_NAV_ITEMS[4].icon },
    billing:       { title: 'Billing',         sub: 'Invoices and payments',        icon: ALL_NAV_ITEMS[5].icon },
    inventory:     { title: 'Inventory',       sub: 'Stock management',             icon: ALL_NAV_ITEMS[6].icon },
    staff:         { title: 'Staff & Roles',   sub: 'Team members and permissions', icon: ALL_NAV_ITEMS[7].icon },
    notifications: { title: 'Notifications',   sub: `${notificationsUnread} unread`,icon: ALL_NAV_ITEMS[8].icon },
    profile:       { title: 'My Profile',      sub: 'Account & credentials',        icon: ALL_NAV_ITEMS[9].icon },
    settings:      { title: 'Settings',        sub: 'App preferences',              icon: ALL_NAV_ITEMS[10].icon },
  }), [user, notificationsUnread]);

  const meta = pageMeta[page] || pageMeta.home;

  const renderPage = () => {
    switch (page) {
      case 'home':          return <DashboardScreen user={user} goTo={goTo} />;
      case 'appointments':  return <AppointmentsScreen user={user} />;
      case 'pharmacy':      return <PharmacyScreen user={user} />;
      case 'emr':           return <EMRScreen user={user} />;
      case 'lab':           return <LabScreen user={user} />;
      case 'billing':       return <BillingScreen />;
      case 'inventory':     return <InventoryScreen />;
      case 'staff':         return <StaffScreen />;
      case 'notifications': return <NotificationsScreen />;
      case 'profile':       return <ProfileScreen user={user} onUpdateUser={onUpdateUser} />;
      case 'settings':      return <SettingsScreen />;
      default:              return <DashboardScreen user={user} goTo={goTo} />;
    }
  };

  const handleUserMenuSelect = (key) => {
    if (key === 'profile')  goTo('profile');
    if (key === 'settings') goTo('settings');
    if (key === 'logout')   onLogout();
  };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <PageSeo pageKey={page} />
      <Sidebar
        navItems={navItems}
        activeId={page}
        onChange={goTo}
        user={user}
        isDark={isDark}
        onToggleTheme={toggle}
        onLogout={onLogout}
        open={sidebarDocked ? true : sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        overlay={!sidebarDocked}
      />
      <View style={styles.main}>
        <TopBar
          meta={meta}
          user={user}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          onShowNotifications={() => { goTo('notifications'); setNotificationsUnread(0); }}
          sidebarOpen={sidebarOpen}
          sidebarDocked={sidebarDocked}
          notificationsUnread={notificationsUnread}
          onUserMenuSelect={handleUserMenuSelect}
          userMenuOpen={userMenuOpen}
          setUserMenuOpen={setUserMenuOpen}
        />
        {userMenuOpen && (
          <TouchableWithoutFeedback onPress={() => setUserMenuOpen(false)}>
            <View style={styles.menuOverlay} />
          </TouchableWithoutFeedback>
        )}
        <View style={styles.page}>{renderPage()}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, flexDirection: 'row' },
  main:        { flex: 1, position: 'relative' },
  page:        { flex: 1 },
  menuOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 1 },
});
