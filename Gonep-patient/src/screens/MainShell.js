// FILE: src/screens/MainShell.js
// COMPLETE REPLACEMENT

import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { Sidebar } from '../organisms/Sidebar';
import { TopBar } from '../organisms/TopBar';
import { DashboardScreen } from './clinical/Dashboard';
import { AppointmentsScreen, AppointmentDetailsScreen } from './clinical/Appointments';
import { BookAppointmentScreen } from './clinical/Appointments/BookAppointmentScreen';
import { RecordDetailsScreen, RecordsScreen } from './clinical/Records';
import { NotificationsScreen } from './account/Notifications';
import { ProfileScreen } from './account/Profile';
import { SettingsScreen } from './account/Settings';
import { SupportScreen } from './account/Support';
import { PageSeo } from '../seo/PageSeo';
import { decoratePatientNavItems } from '../config/patientModules';
import { usePatientRealtime } from '../hooks/usePatientRealtime';
import { getCurrentUser } from '../api';

// ─── DISABLED IMPORTS (code retained, UI hidden) ───────────────────────────
// import { VitalsScreen } from './clinical/Vitals';
// import { ChatScreen } from './clinical/Chat';
// import { OrdersScreen } from './operations/Orders';
// import { TrackOrderScreen } from './operations/TrackOrder';

// ─── NAV ITEMS ─────────────────────────────────────────────────────────────
// Items commented out are disabled — code untouched, just hidden from sidebar.
const NAV_ITEMS = [
  { id: 'home',          label: 'Dashboard',       icon: { lib: 'feather', name: 'home' } },
  { id: 'appointments',  label: 'Appointments',     icon: { lib: 'feather', name: 'calendar' } },
  // { id: 'orders',     label: 'Order Medicines',  icon: { lib: 'mc', name: 'pill' } },          // DISABLED — NI
  // { id: 'track',      label: 'Track Order',      icon: { lib: 'mc', name: 'truck-delivery' } }, // DISABLED — NI
  { id: 'records',       label: 'Medical Records',  icon: { lib: 'mc', name: 'file-document-outline' } },
  // { id: 'vitals',     label: 'My Vitals',        icon: { lib: 'feather', name: 'activity' } },  // DISABLED — NI
  // { id: 'chat',       label: 'Chat with Doctor', icon: { lib: 'feather', name: 'message-circle' } }, // DISABLED — NI
  { id: 'notifications', label: 'Notifications',    icon: { lib: 'feather', name: 'bell' } },
  { id: 'profile',       label: 'My Profile',       icon: { lib: 'feather', name: 'user' } },
  { id: 'settings',      label: 'Settings',         icon: { lib: 'feather', name: 'settings' } },
  { id: 'support',       label: 'Support',          icon: { lib: 'feather', name: 'help-circle' } },
];

// ─── GREETING HELPER ───────────────────────────────────────────────────────
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5  && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

export function MainShell({ user, onLogout, onUpdateUser }) {
  const { C, toggle, isDark } = useTheme();
  const { sidebarDocked } = useResponsive();
  const [page, setPage] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(sidebarDocked);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const {
    appointments,
    notifications,
    unreadCount: notificationsUnread,
    loading: realtimeLoading,
    settings,
    markRead,
    markAllRead,
    upsertAppointment,
    hardRefresh,
    refreshNotifications,
  } = usePatientRealtime();

  const navItems = useMemo(() => decoratePatientNavItems(NAV_ITEMS), []);

  useEffect(() => {
    setSidebarOpen(sidebarDocked);
  }, [sidebarDocked]);

  // Ensure we always greet with the server-hydrated user (dev/prod).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const fresh = await getCurrentUser();
        if (!active || !fresh) return;
        onUpdateUser && onUpdateUser(fresh);
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, [onUpdateUser]);

  // ─── Page meta — all dynamic, no hardcoded names ────────────────────────
  const greeting = useMemo(() => getGreeting(), []);
  const userName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
    : '';

  const pageMeta = useMemo(
    () => ({
      home:              { title: greeting, sub: userName ? `${userName} — Dashboard` : 'Dashboard', icon: NAV_ITEMS[0].icon },
      appointments:      { title: 'Appointments',    sub: 'Manage your bookings',            icon: NAV_ITEMS[1].icon },
      bookAppointment:   { title: 'Book Appointment', sub: 'Find a doctor and schedule',     icon: NAV_ITEMS[1].icon },
      records:           { title: 'Medical Records', sub: 'Your health history',             icon: NAV_ITEMS[2].icon },
      recordDetails:     { title: 'Record Details',  sub: 'View full record',                icon: NAV_ITEMS[2].icon },
      notifications:     {
        title: 'Notifications',
        sub: notificationsUnread > 0 ? `${notificationsUnread} unread` : 'All caught up',
        icon: NAV_ITEMS[3].icon,
      },
      profile:           { title: 'My Profile',      sub: 'Account & personal info',        icon: NAV_ITEMS[4].icon },
      settings:          { title: 'Settings',        sub: 'App preferences',                icon: NAV_ITEMS[5].icon },
      support:           { title: 'Support',         sub: 'Contact care and technical support', icon: NAV_ITEMS[6].icon },
      appointmentDetails:{ title: 'Appointment',     sub: 'View details',                   icon: NAV_ITEMS[1].icon },
      // ── Disabled pages (retain meta for when re-enabled) ──────────────────
      // orders:         { title: 'Order Medicines', sub: 'Shop, cart, and order history',  icon: { lib: 'mc', name: 'pill' } },
      // track:          { title: 'Track Order',     sub: 'Live delivery status',           icon: { lib: 'mc', name: 'truck-delivery' } },
      // vitals:         { title: 'My Vitals',       sub: 'Health monitoring',              icon: { lib: 'feather', name: 'activity' } },
      // chat:           { title: 'Chat',            sub: 'Doctor chat',                    icon: { lib: 'feather', name: 'message-circle' } },
    }),
    [notificationsUnread, greeting, userName]
  );

  const meta = pageMeta[page] || pageMeta.home;
  const seoKey = ['appointmentDetails', 'bookAppointment'].includes(page) ? 'appointments' : page;

  // ─── Navigation helpers ─────────────────────────────────────────────────
  const openAppointmentDetails = (id) => {
    setSelectedAppointmentId(id);
    setPage('appointmentDetails');
  };

  const openRecordDetails = (recordId) => {
    setSelectedRecordId(recordId);
    setPage('recordDetails');
  };

  const handleUserMenuSelect = (key) => {
    if (key === 'profile')   setPage('profile');
    else if (key === 'settings') setPage('settings');
    else if (key === 'logout')   onLogout();
  };

  // ─── Post-action notification refresh ──────────────────────────────────
  const handleAppointmentAction = useCallback(async (updatedAppointment) => {
    if (updatedAppointment) upsertAppointment(updatedAppointment);
    // Immediate notification refresh so doctor/admin see it right away
    await refreshNotifications();
  }, [upsertAppointment, refreshNotifications]);

  // ─── Page renderer ──────────────────────────────────────────────────────
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
            greeting={greeting}
          />
        );

      case 'appointments':
        return (
          <AppointmentsScreen
            appointments={appointments}
            loading={realtimeLoading}
            onOpenDetails={openAppointmentDetails}
            onBookAppointment={() => setPage('bookAppointment')}
            onRefresh={hardRefresh}
          />
        );

      case 'bookAppointment':
        return (
          <BookAppointmentScreen
            onBack={() => setPage('appointments')}
            onBooked={async (newAppt) => {
              await hardRefresh();
              setPage('appointments');
            }}
          />
        );

      case 'appointmentDetails':
        return (
          <AppointmentDetailsScreen
            appointmentId={selectedAppointmentId}
            onAppointmentChanged={handleAppointmentAction}
            onBack={() => setPage('appointments')}
          />
        );

      case 'records':
        return <RecordsScreen onOpenRecord={openRecordDetails} />;

      case 'recordDetails':
        return (
          <RecordDetailsScreen
            recordId={selectedRecordId}
            onBack={() => setPage('records')}
          />
        );

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
        return (
          <ProfileScreen
            user={user}
            onUpdateUser={async (updated) => {
              // Refetch from server to get accurate lock flags and all fields
              const { getCurrentUser } = require('../api');
              try {
                const fresh = await getCurrentUser();
                if (fresh) onUpdateUser(fresh);
                else onUpdateUser(updated);
              } catch {
                onUpdateUser(updated);
              }
            }}
          />
        );

      case 'settings':
        return <SettingsScreen />;

      case 'support':
        return <SupportScreen />;

      // ── Disabled pages — routes commented out but code exists ──────────
      // case 'orders':
      //   return <OrdersScreen onTrackOrder={() => {}} onReorderOrder={() => {}} />;
      // case 'track':
      //   return <TrackOrderScreen orderId={null} />;
      // case 'vitals':
      //   return <VitalsScreen />;
      // case 'chat':
      //   return <ChatScreen />;

      default:
        return (
          <DashboardScreen
            user={user}
            goTo={setPage}
            appointments={appointments}
            loadingAppointments={realtimeLoading}
            greeting={greeting}
          />
        );
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <PageSeo pageKey={seoKey} />
      <Sidebar
        navItems={navItems}
        activeId={
          ['appointmentDetails', 'bookAppointment'].includes(page)
            ? 'appointments'
            : ['recordDetails'].includes(page)
            ? 'records'
            : page
        }
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
            user={user}
            onToggleSidebar={() => setSidebarOpen((o) => !o)}
            onShowNotifications={() => setPage('notifications')}
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

// Missing import — add at top
function useCallback(fn, deps) {
  return React.useCallback(fn, deps);
}

const styles = StyleSheet.create({
  root:         { flex: 1, flexDirection: 'row' },
  main:         { flex: 1, position: 'relative' },
  page:         { flex: 1, zIndex: 1 },
  topBarLayer:  { zIndex: 15, elevation: 15 },
  menuOverlay:  { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 10 },
});
