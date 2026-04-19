// ─── MainShell.js ─────────────────────────────────────────────────────────────
// Authenticated app shell. Owns:
//   - Role-gated nav tree (sections + collapsible groups + sub-items)
//   - Page routing via goTo()
//   - Unread notification badge
//   - Sidebar open/close state
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { Sidebar } from '../organisms/Sidebar';
import { TopBar } from '../organisms/TopBar';
import { PageSeo } from '../seo/PageSeo';
import { getAllowedPages, normalizeRole } from '../config/roles';
import { getNotifications } from '../api';

import { DashboardScreen, AppointmentsScreen, AvailabilityScreen,
         EMRScreen, LabScreen, PharmacyScreen }     from './clinical';
import { BillingScreen, InventoryScreen, StaffScreen,
         LogsScreen, AnalyticsScreen, SupportTicketsScreen } from './operations';
import { NotificationsScreen, ProfileScreen,
         SettingsScreen }                           from './account';
import { POSScreen }                                from './pos';

// ─── Nav tree definition ──────────────────────────────────────────────────────
// Each entry is either a section or a nav item.
// Nav items can have sub-items (collapsible group).
// Sub-items carry a filter hint used by the target screen.
//
// Structure: { section, items: [ NavItem ] }
// NavItem:   { id, label, icon, sub?, pageId? }
//   - id       : unique identifier used for routing + active highlighting
//   - pageId   : if set, goTo() navigates to this page (for sub-items that are
//                filters within the same page, we pass a sub-filter prop)
//   - sub      : array of SubItem { id, label, filter? }

const ALL_NAV_TREE = [
  // ── Section: none (Dashboard sits alone at the top) ──
  {
    section: null,
    roles: ['hospital_admin','doctor','billing_manager','lab_manager','receptionist'],
    items: [
      {
        id: 'home', label: 'Dashboard',
        icon: { lib: 'feather', name: 'home' },
        roles: ['hospital_admin','doctor','billing_manager','lab_manager','receptionist'],
      },
    ],
  },

  // ── Section: Clinical ──────────────────────────────────────────────────────
  {
    section: 'Clinical',
    roles: ['hospital_admin','doctor','lab_manager','receptionist'],
    items: [
      {
        id: 'appointments', label: 'Appointments',
        icon: { lib: 'feather', name: 'calendar' },
        roles: ['hospital_admin','doctor','receptionist'],
        sub: [
          { id: 'appts-all',        label: 'All appointments',   filter: 'all'        },
          { id: 'appts-today',      label: 'Today',              filter: 'today'      },
          { id: 'appts-upcoming',   label: 'Upcoming',           filter: 'upcoming'   },
          { id: 'appts-unassigned', label: 'Unassigned',         filter: 'unassigned',
            roles: ['hospital_admin','receptionist'] },
          { id: 'appts-confirmed',  label: 'Confirmed',          filter: 'confirmed'  },
        ],
      },
      {
        id: 'availability', label: 'Availability',
        icon: { lib: 'feather', name: 'clock' },
        roles: ['hospital_admin','doctor','receptionist'],
        sub: [
          { id: 'avail-my',      label: 'My schedule',     roles: ['doctor'] },
          { id: 'avail-doctors', label: 'All doctors',     roles: ['hospital_admin','receptionist'] },
        ],
      },
      {
        id: 'pharmacy', label: 'Pharmacy & Rx',
        icon: { lib: 'mc', name: 'pill' },
        roles: ['hospital_admin','doctor','lab_manager'],
        sub: [
          { id: 'pharmacy-pending',    label: 'Pending dispatch' },
          { id: 'pharmacy-dispatched', label: 'Dispatched'       },
        ],
      },
      {
        id: 'emr', label: 'EMR',
        icon: { lib: 'mc', name: 'file-document-outline' },
        roles: ['hospital_admin','doctor'],
      },
      {
        id: 'lab', label: 'Lab Results',
        icon: { lib: 'mc', name: 'flask-outline' },
        roles: ['hospital_admin','doctor','lab_manager'],
        sub: [
          { id: 'lab-all',      label: 'All results'    },
          { id: 'lab-critical', label: 'Critical flags' },
          { id: 'lab-normal',   label: 'Normal'         },
        ],
      },
    ],
  },

  // ── Section: Operations ────────────────────────────────────────────────────
  {
    section: 'Operations',
    roles: ['hospital_admin','billing_manager','lab_manager'],
    items: [
      {
        id: 'billing', label: 'Billing',
        icon: { lib: 'feather', name: 'dollar-sign' },
        roles: ['hospital_admin','billing_manager'],
        sub: [
          { id: 'billing-all',     label: 'All invoices' },
          { id: 'billing-pending', label: 'Pending'      },
          { id: 'billing-overdue', label: 'Overdue'      },
          { id: 'billing-paid',    label: 'Paid'         },
        ],
      },
      {
        id: 'inventory', label: 'Inventory',
        icon: { lib: 'mc', name: 'package-variant' },
        roles: ['hospital_admin','lab_manager','billing_manager'],
        sub: [
          { id: 'inv-all',     label: 'All items'   },
          { id: 'inv-low',     label: 'Low stock'   },
          { id: 'inv-out',     label: 'Out of stock'},
        ],
      },
      {
        id: 'staff', label: 'Staff & Roles',
        icon: { lib: 'feather', name: 'users' },
        roles: ['hospital_admin'],
        sub: [
          { id: 'staff-all',         label: 'All members'     },
          { id: 'staff-doctors',     label: 'Doctors'         },
          { id: 'staff-billing',     label: 'Billing mgrs'   },
          { id: 'staff-lab',         label: 'Lab / pharmacy' },
          { id: 'staff-reception',   label: 'Receptionists'  },
        ],
      },
      {
        id: 'logs', label: 'Activity Logs',
        icon: { lib: 'feather', name: 'activity' },
        roles: ['hospital_admin'],
      },
      {
        id: 'analytics', label: 'Analytics',
        icon: { lib: 'feather', name: 'trending-up' },
        roles: ['hospital_admin', 'billing_manager'],
      },
      {
        id: 'support', label: 'Support Tickets',
        icon: { lib: 'feather', name: 'life-buoy' },
        roles: ['hospital_admin','doctor','billing_manager','lab_manager','receptionist'],
        sub: [
          { id: 'support-all',      label: 'All tickets'           },
          { id: 'support-open',     label: 'Open'                  },
          { id: 'support-mine',     label: 'My tickets'            },
          { id: 'support-resolved', label: 'Resolved / Closed'     },
        ],
      },
    ],
  },

  // ── Section: Account ───────────────────────────────────────────────────────
  {
    section: 'Account',
    roles: ['hospital_admin','doctor','billing_manager','lab_manager','receptionist'],
    items: [
      {
        id: 'notifications', label: 'Notifications',
        icon: { lib: 'feather', name: 'bell' },
        roles: ['hospital_admin','doctor','billing_manager','lab_manager','receptionist'],
      },
      {
        id: 'profile', label: 'My Profile',
        icon: { lib: 'feather', name: 'user' },
        roles: ['hospital_admin','doctor','billing_manager','lab_manager','receptionist'],
      },
      {
        id: 'settings', label: 'Settings',
        icon: { lib: 'feather', name: 'settings' },
        roles: ['hospital_admin'],
      },
    ],
  },
];

// ─── Sub-item → parent page mapping ──────────────────────────────────────────
// When a sub-item is activated, which page gets rendered + which filter is passed
const SUB_TO_PAGE = {
  'appts-all':        { page: 'appointments', filter: 'all'        },
  'appts-today':      { page: 'appointments', filter: 'today'      },
  'appts-upcoming':   { page: 'appointments', filter: 'upcoming'   },
  'appts-unassigned': { page: 'appointments', filter: 'unassigned' },
  'appts-confirmed':  { page: 'appointments', filter: 'confirmed'  },
  'avail-my':         { page: 'availability', filter: 'my'         },
  'avail-doctors':    { page: 'availability', filter: 'doctors'    },
  'pharmacy-pending':     { page: 'pharmacy', filter: 'pending_dispatch' },
  'pharmacy-dispatched':  { page: 'pharmacy', filter: 'dispatched'       },
  'lab-all':          { page: 'lab',          filter: 'all'         },
  'lab-critical':     { page: 'lab',          filter: 'critical'    },
  'lab-normal':       { page: 'lab',          filter: 'normal'      },
  'billing-all':      { page: 'billing',      filter: 'all'         },
  'billing-pending':  { page: 'billing',      filter: 'pending'     },
  'billing-overdue':  { page: 'billing',      filter: 'overdue'     },
  'billing-paid':     { page: 'billing',      filter: 'paid'        },
  'inv-all':          { page: 'inventory',    filter: 'all'         },
  'inv-low':          { page: 'inventory',    filter: 'low'         },
  'inv-out':          { page: 'inventory',    filter: 'out'         },
  'staff-all':        { page: 'staff',        filter: 'all'         },
  'staff-doctors':    { page: 'staff',        filter: 'doctor'      },
  'staff-billing':    { page: 'staff',        filter: 'billing_manager' },
  'staff-lab':        { page: 'staff',        filter: 'lab_manager'     },
  'staff-reception':  { page: 'staff',        filter: 'receptionist'    },
  'support-all':      { page: 'support',      filter: 'all'             },
  'support-open':     { page: 'support',      filter: 'open'            },
  'support-mine':     { page: 'support',      filter: 'mine'            },
  'support-resolved': { page: 'support',      filter: 'resolved'        },
};

// ─── Build page meta from nav tree (avoids fragile index refs) ────────────────
const PAGE_META_BASE = {
  home:          { title: 'Dashboard',       sub: '' },
  appointments:  { title: 'Appointments',    sub: 'Patient scheduling'          },
  availability:  { title: 'Availability',    sub: 'Doctor schedules & slots'    },
  pharmacy:      { title: 'Pharmacy & Rx',   sub: 'Prescription dispatch queue' },
  emr:           { title: 'EMR',             sub: 'Electronic medical records'  },
  lab:           { title: 'Lab Results',     sub: 'Results and critical flags'  },
  billing:       { title: 'Billing',         sub: 'Invoices and payments'       },
  inventory:     { title: 'Inventory',       sub: 'Stock management'            },
  staff:         { title: 'Staff & Roles',   sub: 'Team members and permissions'},
  logs:          { title: 'Activity Logs',   sub: 'Full audit trail'            },
  notifications: { title: 'Notifications',   sub: '' },
  profile:       { title: 'My Profile',      sub: 'Account & credentials'       },
  settings:      { title: 'Settings',        sub: 'App preferences'             },
};

// Find icon for a page from the tree
function iconForPage(pageId) {
  for (const group of ALL_NAV_TREE) {
    for (const item of group.items) {
      if (item.id === pageId) return item.icon;
    }
  }
  return { lib: 'feather', name: 'home' };
}

// ─── MainShell ────────────────────────────────────────────────────────────────
export function MainShell({ user, onLogout, onUpdateUser }) {
  const { C, toggle, isDark } = useTheme();
  const { sidebarDocked }     = useResponsive();
  const userRole = normalizeRole(user.role);

  const allowedPages = useMemo(() => getAllowedPages(userRole), [userRole]);

  // Build the filtered nav tree for this role
  const navTree = useMemo(() => {
    const result = [];
    for (const group of ALL_NAV_TREE) {
      // Skip entire section if role not in section roles
      if (group.roles && !group.roles.includes(userRole)) continue;

      const items = group.items
        .filter(item => !item.roles || item.roles.includes(userRole))
        .filter(item => allowedPages.includes(item.id))
        .map(item => ({
          ...item,
          sub: item.sub
            ? item.sub.filter(s => !s.roles || s.roles.includes(userRole))
            : undefined,
        }));

      if (items.length > 0) {
        result.push({ section: group.section, items });
      }
    }
    return result;
  }, [userRole, allowedPages]);

  // Flat list for TopBar and legacy props
  const navItems = useMemo(() =>
    navTree.flatMap(g => g.items),
  [navTree]);

  const defaultPage = allowedPages[0] || 'home';
  const [page,         setPage]         = useState(defaultPage);
  const [pageFilter,   setPageFilter]   = useState(null);
  const [sidebarOpen,  setSidebarOpen]  = useState(sidebarDocked);
  const [notifUnread,  setNotifUnread]  = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => { setSidebarOpen(sidebarDocked); }, [sidebarDocked]);

  const refreshUnread = useCallback(() => {
    let active = true;
    getNotifications()
      .then(items => { if (active) setNotifUnread((items || []).filter(n => !n.read).length); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => refreshUnread(), [refreshUnread]);

  // goTo handles both direct page IDs and sub-item IDs
  const goTo = useCallback((id) => {
    // Auto-close overlay sidebar on any navigation (mobile UX)
    if (!sidebarDocked) setSidebarOpen(false);
    if (SUB_TO_PAGE[id]) {
      const { page: p, filter: f } = SUB_TO_PAGE[id];
      setPage(p);
      setPageFilter(f);
    } else if (allowedPages.includes(id)) {
      setPage(id);
      setPageFilter(null);
    }
  }, [allowedPages, sidebarDocked]);

  // Page meta (title, sub, icon)
  const meta = useMemo(() => {
    const base = PAGE_META_BASE[page] || PAGE_META_BASE.home;
    return {
      ...base,
      sub: page === 'home'
        ? `${user.first_name} ${user.last_name}${user.specialty ? ' · ' + user.specialty : ''}`
        : page === 'notifications'
        ? `${notifUnread} unread`
        : base.sub,
      icon: iconForPage(page),
    };
  }, [page, user, notifUnread]);

  // POS role renders a completely different fullscreen interface
  if (userRole === 'pos') {
    return (
      <View style={[styles.root, { backgroundColor: C.bg }]}>
        <POSScreen user={user} onLogout={onLogout} />
      </View>
    );
  }

  const renderPage = () => {
    switch (page) {
      case 'home':          return <DashboardScreen    user={user} goTo={goTo} />;
      case 'appointments':  return <AppointmentsScreen user={user} filter={pageFilter} />;
      case 'availability':  return <AvailabilityScreen user={user} filter={pageFilter} />;
      case 'pharmacy':      return <PharmacyScreen     user={user} filter={pageFilter} />;
      case 'emr':           return <EMRScreen          user={user} />;
      case 'lab':           return <LabScreen          user={user} filter={pageFilter} />;
      case 'billing':       return <BillingScreen      filter={pageFilter} />;
      case 'inventory':     return <InventoryScreen    user={user} filter={pageFilter} />;
      case 'staff':         return <StaffScreen        user={user} filter={pageFilter} />;
      case 'logs':          return <LogsScreen           user={user} />;
      case 'analytics':    return <AnalyticsScreen      user={user} />;
      case 'support':      return <SupportTicketsScreen  user={user} filter={pageFilter} />;
      case 'notifications': return <NotificationsScreen onRead={refreshUnread} />;
      case 'profile':       return <ProfileScreen      user={user} onUpdateUser={onUpdateUser} />;
      case 'settings':      return <SettingsScreen user={user} onLogout={onLogout} />;
      default:              return <DashboardScreen    user={user} goTo={goTo} />;
    }
  };

  const handleUserMenuSelect = (key) => {
    if (key === 'profile')  goTo('profile');
    if (key === 'settings') goTo('settings');
    if (key === 'logout')   onLogout();
  };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <PageSeo pageKey={page} user={user} />

      <Sidebar
        navTree={navTree}
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
        notificationsUnread={notifUnread}
      />

      <View style={styles.main}>
        {userMenuOpen && (
          <TouchableWithoutFeedback onPress={() => setUserMenuOpen(false)}>
            <View style={styles.menuOverlay} />
          </TouchableWithoutFeedback>
        )}
        <View style={styles.topBarLayer}>
        <TopBar
          meta={meta}
          user={user}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
          onShowNotifications={() => { goTo('notifications'); setNotifUnread(0); }}
          sidebarOpen={sidebarOpen}
          sidebarDocked={sidebarDocked}
          notificationsUnread={notifUnread}
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
  root:        { flex: 1, flexDirection: 'row' },
  main:        { flex: 1, position: 'relative' },
  page:        { flex: 1, zIndex: 1 },
  topBarLayer: { zIndex: 15, elevation: 15 },
  menuOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 10 },
});
