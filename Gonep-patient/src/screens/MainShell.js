import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { Sidebar } from '../organisms/Sidebar';
import { TopBar } from '../organisms/TopBar';
import { DashboardScreen } from './clinical/Dashboard';
import { AppointmentsScreen, AppointmentDetailsScreen } from './clinical/Appointments';
import { RecordDetailsScreen, RecordsScreen } from './clinical/Records';
import { VitalsScreen } from './clinical/Vitals';
import { ChatScreen } from './clinical/Chat';
import { OrdersScreen } from './operations/Orders';
import { TrackOrderScreen } from './operations/TrackOrder';
import { NotificationsScreen } from './account/Notifications';
import { ProfileScreen } from './account/Profile';
import { SettingsScreen } from './account/Settings';
import { SupportScreen } from './account/Support';
import { PageSeo } from '../seo/PageSeo';
import { decoratePatientNavItems, getPatientModuleIntegrationReason } from '../config/patientModules';
import { usePatientRealtime } from '../hooks/usePatientRealtime';

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
  { id: 'support', label: 'Support', icon: { lib: 'feather', name: 'help-circle' } },
];

export function MainShell({ user, onLogout, onUpdateUser }) {
  const { C, toggle, isDark } = useTheme();
  const { sidebarDocked } = useResponsive();
  const [page, setPage] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(sidebarDocked);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const {
    appointments,
    notifications,
    unreadCount: notificationsUnread,
    loading: realtimeLoading,
    settings,
    markRead,
    markAllRead,
    upsertAppointment,
  } = usePatientRealtime();
  const navItems = useMemo(() => decoratePatientNavItems(NAV_ITEMS), []);

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    // Auto-dock or collapse sidebar when breakpoint changes
    setSidebarOpen(sidebarDocked);
  }, [sidebarDocked]);

  const pageMeta = useMemo(
    () => ({
      home: { title: 'Good morning', sub: 'Faith Njoroge — Patient Dashboard', icon: NAV_ITEMS[0].icon },
      appointments: { title: 'Appointments', sub: 'Manage your bookings', icon: NAV_ITEMS[1].icon },
      orders: { title: 'Order Medicines', sub: 'Shop, cart, and order history', icon: NAV_ITEMS[2].icon },
      track: { title: 'Track Order', sub: 'Live delivery status', icon: NAV_ITEMS[3].icon },
      records: { title: 'Medical Records', sub: 'Your health history', icon: NAV_ITEMS[4].icon },
      vitals: { title: 'My Vitals', sub: 'Health monitoring', icon: NAV_ITEMS[5].icon },
      chat: { title: 'Chat', sub: 'Dr. Amina Wanjiku', icon: NAV_ITEMS[6].icon },
      notifications: {
        title: 'Notifications',
        sub: notificationsUnread > 0 ? `${notificationsUnread} unread alerts` : 'All caught up',
        icon: NAV_ITEMS[7].icon,
      },
      profile: { title: 'My Profile', sub: 'Account & personal info', icon: NAV_ITEMS[8].icon },
      settings: { title: 'Settings', sub: 'App preferences', icon: NAV_ITEMS[9].icon },
      support: { title: 'Support', sub: 'Contact care and technical support', icon: NAV_ITEMS[10].icon },
    }),
    [notificationsUnread],
  );

  const meta = pageMeta[page] || pageMeta.home;
  const integrationReason = getPatientModuleIntegrationReason(page);
  const resolvedMeta =
    integrationReason && meta
      ? { ...meta, sub: `Not integrated: ${integrationReason}` }
      : meta;
  const seoKey = page === 'appointmentDetails' ? 'appointments' : page;

  const openAppointmentDetails = (id) => {
    setSelectedAppointmentId(id);
    setPage('appointmentDetails');
  };

  const openTrackOrder = (orderId = null) => {
    setSelectedOrderId(orderId);
    setPage('track');
  };
  const openRecordDetails = (recordId) => {
    setSelectedRecordId(recordId);
    setPage('recordDetails');
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
            appointments={appointments}
            loadingAppointments={realtimeLoading}
            onOpenAppointment={openAppointmentDetails}
            onOpenTrackOrder={openTrackOrder}
          />
        );
      case 'appointments':
        return (
          <AppointmentsScreen
            appointments={appointments}
            loading={realtimeLoading}
            onOpenDetails={openAppointmentDetails}
          />
        );
      case 'orders':
        return (
          <OrdersScreen
            onTrackOrder={openTrackOrder}
            onReorderOrder={() => setPage('orders')}
          />
        );
      case 'track':
        return <TrackOrderScreen orderId={selectedOrderId} />;
      case 'records':
        return <RecordsScreen onOpenRecord={openRecordDetails} />;
      case 'recordDetails':
        return <RecordDetailsScreen recordId={selectedRecordId} onBack={() => setPage('records')} />;
      case 'vitals':
        return <VitalsScreen />;
      case 'chat':
        return <ChatScreen />;
      case 'notifications':
        return (
          <NotificationsScreen
            notifications={notifications}
            loading={realtimeLoading}
            settings={settings}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
          />
        );
      case 'profile':
        return <ProfileScreen user={user} onUpdateUser={onUpdateUser} />;
      case 'settings':
        return <SettingsScreen />;
      case 'support':
        return <SupportScreen />;
      case 'appointmentDetails':
        return (
          <AppointmentDetailsScreen
            appointmentId={selectedAppointmentId}
            onAppointmentChanged={upsertAppointment}
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
        navItems={navItems}
        activeId={page === 'appointmentDetails' ? 'appointments' : page}
        onChange={setPage}
        user={user}
        isDark={isDark}
        onToggleTheme={toggle}
        onLogout={onLogout}
        open={sidebarDocked ? true : sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        overlay={!sidebarDocked}
        notificationsUnread={notificationsUnread}
      />
      <View style={styles.main}>
        {userMenuOpen && (
          <TouchableWithoutFeedback onPress={() => setUserMenuOpen(false)}>
            <View style={styles.menuOverlay} />
          </TouchableWithoutFeedback>
        )}
        <View style={styles.topBarLayer}>
        <TopBar
          meta={resolvedMeta}
          user={user}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          onShowNotifications={() => {
            setPage('notifications');
          }}
          sidebarOpen={sidebarOpen}
          sidebarDocked={sidebarDocked}
          notificationsUnread={notificationsUnread}
          onUserMenuSelect={handleUserMenuSelect}
          userMenuOpen={userMenuOpen}
          setUserMenuOpen={setUserMenuOpen}
        />
        </View>
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
    zIndex: 1,
  },
  topBarLayer: {
    zIndex: 15,
    elevation: 15,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
  },
});


