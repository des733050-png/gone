import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { Sidebar } from '../organisms/Sidebar';
import { TopBar } from '../organisms/TopBar';
import { DashboardScreen } from './Dashboard';
import { AppointmentsScreen } from './Appointments';
import { OrdersScreen } from './Orders';
import { TrackOrderScreen } from './TrackOrder';
import { RecordsScreen } from './Records';
import { VitalsScreen } from './Vitals';
import { ChatScreen } from './Chat';
import { NotificationsScreen } from './Notifications';
import { ProfileScreen } from './Profile';
import { SettingsScreen } from './Settings';
import { AppointmentDetailsScreen } from './Appointments/index';
import { getNotifications } from '../api';
import { PageSeo } from '../seo/PageSeo';

const NAV_ITEMS = [
  { id: 'home', label: 'Dashboard', icon: { lib: 'feather', name: 'home' } },
  { id: 'appointments', label: 'Appointments', icon: { lib: 'feather', name: 'calendar' } },
  { id: 'orders', label: 'Order Medicines', icon: { lib: 'mc', name: 'pill' } },
  { id: 'track', label: 'Track Order', icon: { lib: 'mc', name: 'truck-delivery' } },
  { id: 'records', label: 'Medical Records', icon: { lib: 'mc', name: 'file-document-outline' } },
  { id: 'vitals', label: 'My Vitals', icon: { lib: 'feather', name: 'activity' } },
  { id: 'chat', label: 'Chat with Doctor', icon: { lib: 'feather', name: 'message-circle' } },
  { id: 'notifications', label: 'Notifications', icon: { lib: 'feather', name: 'bell' } },
  { id: 'profile', label: 'My Profile', icon: { lib: 'feather', name: 'user' } },
  { id: 'settings', label: 'Settings', icon: { lib: 'feather', name: 'settings' } },
];

export function MainShell({ user, onLogout, onUpdateUser }) {
  const { C, toggle, isDark } = useTheme();
  const { sidebarDocked } = useResponsive();
  const [page, setPage] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(sidebarDocked);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [notificationsUnread, setNotificationsUnread] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    // Auto-dock or collapse sidebar when breakpoint changes
    setSidebarOpen(sidebarDocked);
  }, [sidebarDocked]);

  useEffect(() => {
    let mounted = true;
    const loadNotifications = async () => {
      try {
        const items = await getNotifications();
        if (mounted) {
          const unread = (items || []).filter((n) => !n.read).length;
          setNotificationsUnread(unread);
        }
      } catch (e) {
        // ignore in mock
      }
    };
    loadNotifications();
    return () => {
      mounted = false;
    };
  }, []);

  const pageMeta = useMemo(
    () => ({
      home: { title: 'Good morning', sub: 'Faith Njoroge — Patient Dashboard', icon: NAV_ITEMS[0].icon },
      appointments: { title: 'Appointments', sub: 'Manage your bookings', icon: NAV_ITEMS[1].icon },
      orders: { title: 'Order Medicines', sub: 'Shop, cart, and order history', icon: NAV_ITEMS[2].icon },
      track: { title: 'Track Order', sub: 'Live delivery status', icon: NAV_ITEMS[3].icon },
      records: { title: 'Medical Records', sub: 'Your health history', icon: NAV_ITEMS[4].icon },
      vitals: { title: 'My Vitals', sub: 'Health monitoring', icon: NAV_ITEMS[5].icon },
      chat: { title: 'Chat', sub: 'Dr. Amina Wanjiku', icon: NAV_ITEMS[6].icon },
      notifications: { title: 'Notifications', sub: '2 unread alerts', icon: NAV_ITEMS[7].icon },
      profile: { title: 'My Profile', sub: 'Account & personal info', icon: NAV_ITEMS[8].icon },
      settings: { title: 'Settings', sub: 'App preferences', icon: NAV_ITEMS[9].icon },
    }),
    [],
  );

  const meta = pageMeta[page] || pageMeta.home;
  const seoKey = page === 'appointmentDetails' ? 'appointments' : page;

  const openAppointmentDetails = (id) => {
    setSelectedAppointmentId(id);
    setPage('appointmentDetails');
  };

  const handleUserMenuSelect = (key) => {
    if (key === 'profile') {
      setPage('profile');
    } else if (key === 'settings') {
      setPage('settings');
    } else if (key === 'logout') {
      onLogout();
    }
  };

  const renderPage = () => {
    switch (page) {
      case 'home':
        return (
          <DashboardScreen
            user={user}
            goTo={setPage}
            onOpenAppointment={openAppointmentDetails}
          />
        );
      case 'appointments':
        return <AppointmentsScreen onOpenDetails={openAppointmentDetails} />;
      case 'orders':
        return (
          <OrdersScreen
            onTrackOrder={() => setPage('track')}
            onReorderOrder={() => setPage('orders')}
          />
        );
      case 'track':
        return <TrackOrderScreen />;
      case 'records':
        return <RecordsScreen />;
      case 'vitals':
        return <VitalsScreen />;
      case 'chat':
        return <ChatScreen user={user} />;
      case 'notifications':
        return <NotificationsScreen />;
      case 'profile':
        return <ProfileScreen user={user} onUpdateUser={onUpdateUser} />;
      case 'settings':
        return <SettingsScreen />;
      case 'appointmentDetails':
        return (
          <AppointmentDetailsScreen
            appointmentId={selectedAppointmentId}
            onBack={() => setPage('appointments')}
          />
        );
      default:
        return <DashboardScreen user={user} goTo={setPage} />;
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <PageSeo pageKey={seoKey} />
      <Sidebar
        navItems={NAV_ITEMS}
        activeId={page === 'appointmentDetails' ? 'appointments' : page}
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
          onShowNotifications={() => {
            setPage('notifications');
            setNotificationsUnread(0);
          }}
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
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  main: {
    flex: 1,
    position: 'relative',
  },
  page: {
    flex: 1,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
  },
});


