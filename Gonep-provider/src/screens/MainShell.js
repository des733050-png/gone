// ─── MainShell.js ─────────────────────────────────────────────────────────────
// Authenticated app shell. Owns:
//   - Role-gated nav tree (sections + collapsible groups + sub-items)
//   - Page routing via goTo()
//   - Unread notification badge
//   - Sidebar open/close state
//   - Verification gate: when facility is not VERIFIED or is SUSPENDED the
//     sidebar is locked and VerificationDashboard is shown in the main area.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { Sidebar } from '../organisms/Sidebar';
import { TopBar } from '../organisms/TopBar';
import { PageSeo } from '../seo/PageSeo';
import { getAllowedPages, normalizeRole } from '../config/roles';
import { getNotifications, getCurrentUser } from '../api';
import { VerificationDashboard } from './Auth/Onboarding/VerificationDashboard';

import { DashboardScreen, AppointmentsScreen, AvailabilityScreen,
         EMRScreen, LabScreen, PharmacyScreen }     from './clinical';
import { BillingScreen, InventoryScreen, StaffScreen,
         LogsScreen, AnalyticsScreen, SupportTicketsScreen,
         SpecializationsScreen } from './operations';
import { NotificationsScreen, ProfileScreen,
         SettingsScreen }                           from './account';
import { POSScreen }                                from './pos';
// ── Onboarding overlay — shown once to facility_admin on first login only ──
import { GettingStartedOverlay } from './Auth/Onboarding/GettingStartedOverlay';

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
      // Pharmacy & Rx is intentionally disabled — module not yet integrated.
      // {
      //   id: 'pharmacy', label: 'Pharmacy & Rx',
      //   icon: { lib: 'mc', name: 'pill' },
      //   roles: ['hospital_admin','doctor','lab_manager'],
      //   sub: [
      //     { id: 'pharmacy-pending',    label: 'Pending dispatch' },
      //     { id: 'pharmacy-dispatched', label: 'Dispatched'       },
      //   ],
      // },
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
          { id: 'staff-all',             label: 'All members'    },
          { id: 'staff-doctors',         label: 'Doctors'        },
          { id: 'staff-billing',         label: 'Billing mgrs'  },
          { id: 'staff-lab',             label: 'Lab / pharmacy' },
          { id: 'staff-reception',       label: 'Receptionists' },
          { id: 'staff-specializations', label: 'Specializations' },
        ],
      },
      {
        id: 'logs', label: 'Activity Logs',
        icon: { lib: 'feather', name: 'activity' },
        roles: ['hospital_admin'],
      },
      //{
       // id: 'analytics', label: 'Analytics',
        //icon: { lib: 'feather', name: 'trending-up' },
        //roles: ['hospital_admin', 'billing_manager'],
      //},
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
const SUB_TO_PAGE = {
  'appts-all':        { page: 'appointments', filter: 'all'        },
  'appts-today':      { page: 'appointments', filter: 'today'      },
  'appts-upcoming':   { page: 'appointments', filter: 'upcoming'   },
  'appts-unassigned': { page: 'appointments', filter: 'unassigned' },
  'appts-confirmed':  { page: 'appointments', filter: 'confirmed'  },
  'avail-my':         { page: 'availability', filter: 'my'         },
  'avail-doctors':    { page: 'availability', filter: 'doctors'    },
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
  'staff-all':             { page: 'staff',           filter: 'all'              },
  'staff-doctors':         { page: 'staff',           filter: 'doctor'           },
  'staff-billing':         { page: 'staff',           filter: 'billing_manager'  },
  'staff-lab':             { page: 'staff',           filter: 'lab_manager'      },
  'staff-reception':       { page: 'staff',           filter: 'receptionist'     },
  'staff-specializations': { page: 'specializations', filter: null               },
  'support-all':      { page: 'support',      filter: 'all'             },
  'support-open':     { page: 'support',      filter: 'open'            },
  'support-mine':     { page: 'support',      filter: 'mine'            },
  'support-resolved': { page: 'support',      filter: 'resolved'        },
};

// ─── Page meta ────────────────────────────────────────────────────────────────
const PAGE_META_BASE = {
  home:          { title: 'Dashboard',       sub: '' },
  appointments:  { title: 'Appointments',    sub: 'Patient scheduling'          },
  availability:  { title: 'Availability',    sub: 'Doctor schedules & slots'    },
  emr:           { title: 'EMR',             sub: 'Electronic medical records'  },
  lab:           { title: 'Lab Results',     sub: 'Results and critical flags'  },
  billing:       { title: 'Billing',         sub: 'Invoices and payments'       },
  inventory:     { title: 'Inventory',       sub: 'Stock management'            },
  staff:         { title: 'Staff & Roles',   sub: 'Team members and permissions'},
  logs:          { title: 'Activity Logs',   sub: 'Full audit trail'            },
  notifications: { title: 'Notifications',   sub: '' },
  profile:       { title: 'My Profile',      sub: 'Account & credentials'       },
  settings:        { title: 'Settings',         sub: 'App preferences'             },
  specializations: { title: 'Specializations',  sub: 'Manage clinical specializations' },
};

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

  // ── Verification + suspension gate ────────────────────────────────────────
  // verification_status: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED'
  // facility_status:     'pending'    | 'approved' | 'suspended'
  const verificationStatus = user?.verification_status || 'UNVERIFIED';
  const facilityStatus     = user?.facility_status     || 'pending';
  const isVerified  = verificationStatus === 'VERIFIED';
  const isSuspended = facilityStatus === 'suspended';
  // Sidebar and all module pages are locked until the facility is both
  // VERIFIED and not SUSPENDED.
  const isLocked = !isVerified || isSuspended;

  // ── On-mount status check (login / reload) ───────────────────────────────
  // When the shell first mounts with a LOCKED state (unverified or suspended),
  // immediately re-fetch the full user profile so that any approval/suspension
  // the admin applied while the user was offline is reflected right away —
  // without waiting for the VerificationDashboard's 15-second poll.
  //
  // If the fresh profile says VERIFIED → onUpdateUser propagates the change,
  // isLocked flips to false, and the full portal renders in the same tick.
  useEffect(() => {
    if (!isLocked || !onUpdateUser) return;
    let cancelled = false;
    (async () => {
      try {
        const fresh = await getCurrentUser();
        if (!cancelled && fresh) {
          onUpdateUser({ ...fresh, role: normalizeRole(fresh.role) });
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  // Run once on mount (empty deps after isLocked initial value — the effect
  // re-runs if isLocked changes from false→true which covers suspension).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Periodic status re-check (suspension detection for verified accounts) ─
  // While a verified user is on the dashboard, silently re-poll every 5 min
  // and on window focus so admin-applied suspension is reflected without a
  // manual refresh.  VerificationDashboard owns its own 15 s polling when
  // the account is not yet verified.
  useEffect(() => {
    if (!isVerified || !onUpdateUser) return;

    const checkStatus = async () => {
      try {
        const fresh = await getCurrentUser();
        if (fresh) onUpdateUser({ ...fresh, role: normalizeRole(fresh.role) });
      } catch (_) {}
    };

    const intervalId = setInterval(checkStatus, 5 * 60 * 1000);

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('focus', checkStatus);
      return () => {
        clearInterval(intervalId);
        window.removeEventListener('focus', checkStatus);
      };
    }
    return () => clearInterval(intervalId);
  }, [isVerified, onUpdateUser]);
  // ──────────────────────────────────────────────────────────────────────────

  const allowedPages = useMemo(() => getAllowedPages(userRole), [userRole]);

  // Build the filtered nav tree for this role
  const navTree = useMemo(() => {
    const result = [];
    for (const group of ALL_NAV_TREE) {
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
      if (items.length > 0) result.push({ section: group.section, items });
    }
    return result;
  }, [userRole, allowedPages]);

  const navItems = useMemo(() => navTree.flatMap(g => g.items), [navTree]);

  const defaultPage = allowedPages[0] || 'home';

  // ── Persist current page across reloads (web only) ────────────────────────
  const SESSION_PAGE_KEY   = 'gonep_provider_page';
  const SESSION_FILTER_KEY = 'gonep_provider_filter';

  const [page, setPage] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const saved = window.sessionStorage?.getItem(SESSION_PAGE_KEY);
      if (saved && allowedPages.includes(saved)) return saved;
    }
    return defaultPage;
  });

  const [pageFilter, setPageFilter] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.sessionStorage?.getItem(SESSION_FILTER_KEY) || null;
    }
    return null;
  });

  // Keep sessionStorage in sync whenever page/filter changes
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    window.sessionStorage?.setItem(SESSION_PAGE_KEY, page);
    if (pageFilter) {
      window.sessionStorage?.setItem(SESSION_FILTER_KEY, pageFilter);
    } else {
      window.sessionStorage?.removeItem(SESSION_FILTER_KEY);
    }
  }, [page, pageFilter]);
  const [sidebarOpen,  setSidebarOpen]  = useState(sidebarDocked);
  const [notifUnread,  setNotifUnread]  = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // ── Onboarding state ───────────────────────────────────────────────────────
  // Seeded from the server value. Once true here it never goes back to false,
  // so the overlay cannot reappear even before the next auth refresh.
  // Only facility_admin users ever have onboarding_completed === false;
  // all other roles have it true (or absent) and the overlay returns null.
  const [onboardingCompleted, setOnboardingCompleted] = useState(
    user?.onboarding_completed === true
  );
  // Merge the local flag into user so GettingStartedOverlay sees up-to-date state
  const onboardingUser = useMemo(
    () => ({ ...user, onboarding_completed: onboardingCompleted }),
    [user, onboardingCompleted]
  );

  const handleOnboardingDismiss = useCallback(() => {
    setOnboardingCompleted(true);
    // Also push the update up to the auth context so it survives re-renders
    if (onUpdateUser) onUpdateUser({ ...user, onboarding_completed: true });
  }, [user, onUpdateUser]);
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => { setSidebarOpen(sidebarDocked); }, [sidebarDocked]);

  const refreshUnread = useCallback(() => {
    let active = true;
    getNotifications()
      .then(items => { if (active) setNotifUnread((items || []).filter(n => !n.read).length); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => refreshUnread(), [refreshUnread]);

  const goTo = useCallback((id) => {
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
      // case 'pharmacy':   return <PharmacyScreen     user={user} filter={pageFilter} />;
      case 'emr':           return <EMRScreen          user={user} />;
      case 'lab':           return <LabScreen          user={user} filter={pageFilter} />;
      case 'billing':       return <BillingScreen      filter={pageFilter} />;
      case 'inventory':     return <InventoryScreen    user={user} filter={pageFilter} />;
      case 'staff':         return <StaffScreen        user={user} filter={pageFilter} />;
      case 'logs':          return <LogsScreen           user={user} />;
      case 'analytics':     return <AnalyticsScreen      user={user} />;
      case 'support':       return <SupportTicketsScreen user={user} filter={pageFilter} />;
      case 'specializations': return <SpecializationsScreen user={user} />;
      case 'notifications': return <NotificationsScreen onRead={refreshUnread} />;
      case 'profile':       return <ProfileScreen      user={user} onUpdateUser={onUpdateUser} />;
      case 'settings':      return <SettingsScreen     user={user} onLogout={onLogout} />;
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
        locked={isLocked}
        facilityStatus={facilityStatus}
      />

      <View style={styles.main}>
        {userMenuOpen && (
          <TouchableWithoutFeedback onPress={() => setUserMenuOpen(false)}>
            <View style={styles.menuOverlay} />
          </TouchableWithoutFeedback>
        )}
        <View style={styles.topBarLayer}>
          <TopBar
            meta={isLocked ? { title: 'Account Setup', sub: 'Complete verification to access the portal', icon: { lib: 'feather', name: 'shield' } } : meta}
            user={user}
            onToggleSidebar={() => setSidebarOpen(o => !o)}
            onShowNotifications={() => { if (!isLocked) { goTo('notifications'); setNotifUnread(0); } }}
            sidebarOpen={sidebarOpen}
            sidebarDocked={sidebarDocked}
            notificationsUnread={isLocked ? 0 : notifUnread}
            onUserMenuSelect={handleUserMenuSelect}
            userMenuOpen={userMenuOpen}
            setUserMenuOpen={setUserMenuOpen}
          />
        </View>
        <View style={styles.page}>
          {isLocked
            ? (
              <VerificationDashboard
                user={user}
                facilityStatus={facilityStatus}
                onUnlock={(freshUser) => {
                  if (onUpdateUser) onUpdateUser(freshUser);
                }}
                onLogout={onLogout}
              />
            )
            : renderPage()
          }
        </View>
      </View>

      {/* ── First-login onboarding overlay ────────────────────────────────────
           GettingStartedOverlay renders null for every role except
           facility_admin with onboarding_completed === false.
           Only shown when the account is verified and unlocked. */}
      {!isLocked && (
        <GettingStartedOverlay
          user={onboardingUser}
          onDone={handleOnboardingDismiss}
          onSkip={handleOnboardingDismiss}
        />
      )}
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