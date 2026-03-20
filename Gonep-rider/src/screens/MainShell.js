import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { Sidebar } from '../organisms/Sidebar';
import { TopBar } from '../organisms/TopBar';
import { PageSeo } from '../seo/PageSeo';
import { getNotifications } from '../api';

import { DashboardScreen }     from './Dashboard';
import { RequestsScreen }      from './Requests';
import { ActiveDeliveryScreen } from './ActiveDelivery';
import { EarningsScreen }      from './Earnings';
import { TripHistoryScreen }   from './TripHistory';
import { ChatScreen }          from './Chat';
import { NotificationsScreen } from './Notifications';
import { ProfileScreen }       from './Profile';
import { SettingsScreen }      from './Settings';

const NAV_ITEMS = [
  { id: 'home',           label: 'Dashboard',       icon: { lib: 'feather', name: 'home' } },
  { id: 'requests',       label: 'Requests',         icon: { lib: 'mc',      name: 'package-variant' }, badge: 2 },
  { id: 'activeDelivery', label: 'Active Delivery',  icon: { lib: 'mc',      name: 'truck-fast' } },
  { id: 'earnings',       label: 'Earnings',         icon: { lib: 'feather', name: 'dollar-sign' } },
  { id: 'tripHistory',    label: 'Trip History',     icon: { lib: 'feather', name: 'list' } },
  { id: 'chat',           label: 'Chat',             icon: { lib: 'feather', name: 'message-circle' } },
  { id: 'notifications',  label: 'Notifications',    icon: { lib: 'feather', name: 'bell' } },
  { id: 'profile',        label: 'My Profile',       icon: { lib: 'feather', name: 'user' } },
  { id: 'settings',       label: 'Settings',         icon: { lib: 'feather', name: 'settings' } },
];

export function MainShell({ user, onLogout, onUpdateUser }) {
  const { C, toggle, isDark } = useTheme();
  const { sidebarDocked }     = useResponsive();
  const [page, setPage]        = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(sidebarDocked);
  const [notificationsUnread, setNotificationsUnread] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => { setSidebarOpen(sidebarDocked); }, [sidebarDocked]);

  useEffect(() => {
    let mounted = true;
    getNotifications().then((items) => {
      if (mounted) setNotificationsUnread((items || []).filter((n) => !n.read).length);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const pageMeta = useMemo(() => ({
    home:           { title: 'Dashboard',       sub: `${user.first_name} ${user.last_name} · Rider`,  icon: NAV_ITEMS[0].icon },
    requests:       { title: 'Requests',         sub: 'Incoming delivery requests',                      icon: NAV_ITEMS[1].icon },
    activeDelivery: { title: 'Active Delivery',  sub: 'Current delivery in progress',                    icon: NAV_ITEMS[2].icon },
    earnings:       { title: 'Earnings',         sub: 'Payouts and earnings summary',                    icon: NAV_ITEMS[3].icon },
    tripHistory:    { title: 'Trip History',     sub: 'Completed deliveries',                            icon: NAV_ITEMS[4].icon },
    chat:           { title: 'Chat',             sub: 'Patient messages',                                icon: NAV_ITEMS[5].icon },
    notifications:  { title: 'Notifications',    sub: `${notificationsUnread} unread`,                   icon: NAV_ITEMS[6].icon },
    profile:        { title: 'My Profile',       sub: 'Account details',                                 icon: NAV_ITEMS[7].icon },
    settings:       { title: 'Settings',         sub: 'App preferences',                                 icon: NAV_ITEMS[8].icon },
  }), [user, notificationsUnread]);

  const meta = pageMeta[page] || pageMeta.home;

  const renderPage = () => {
    switch (page) {
      case 'home':           return <DashboardScreen user={user} goTo={setPage} />;
      case 'requests':       return <RequestsScreen onAccept={() => setPage('activeDelivery')} />;
      case 'activeDelivery': return <ActiveDeliveryScreen goTo={setPage} />;
      case 'earnings':       return <EarningsScreen />;
      case 'tripHistory':    return <TripHistoryScreen />;
      case 'chat':           return <ChatScreen user={user} />;
      case 'notifications':  return <NotificationsScreen />;
      case 'profile':        return <ProfileScreen user={user} onUpdateUser={onUpdateUser} />;
      case 'settings':       return <SettingsScreen />;
      default:               return <DashboardScreen user={user} goTo={setPage} />;
    }
  };

  const handleUserMenuSelect = (key) => {
    if (key === 'profile')  setPage('profile');
    if (key === 'settings') setPage('settings');
    if (key === 'logout')   onLogout();
  };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <PageSeo pageKey={page} />
      <Sidebar
        navItems={NAV_ITEMS}
        activeId={page}
        onChange={setPage}
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
          onShowNotifications={() => { setPage('notifications'); setNotificationsUnread(0); }}
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
  root: { flex: 1, flexDirection: 'row' },
  main: { flex: 1, position: 'relative' },
  page: { flex: 1 },
  menuOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 1 },
});
