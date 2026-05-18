import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { logoVariants } from '@/animations/globalVariants';
import brandLogo from '@/assets/brandLogo.png';
import ThemeToggle from '@/components/ThemeToggle';
import '@/style/AdminHeader.css';

function AdminHeader() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <>
      <nav className="navbar navbar-light sticky-top admin-navbar py-2">
        <div className="container-fluid">
          <div className="d-flex align-items-center">
            <motion.img src={brandLogo} alt="logo" className="me-2" variants={logoVariants} initial="hidden" animate="visible" drag dragConstraints={{ left: 0, top: 0, bottom: 0, right: 0 }} />
            <span className="text-white fw-bold ms-2">
              GONEP <span className="text-warning ms-1">— ADMIN</span>
            </span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <ThemeToggle />
            <button className="btn d-lg-none text-white" onClick={toggleSidebar}>
              <i className="fa fa-bars"></i>
            </button>
          </div>
        </div>
      </nav>

      <div className={`admin-sidebar sidebar bg-dark text-white ${sidebarOpen ? 'open' : ''} d-flex flex-column`}>
        <ul className="py-1 px-0 flex-grow-1">
          {[
            { to: '/admin/dashboard',          icon: 'fa-tachometer',    label: 'Dashboard' },
            { to: '/admin/categories',          icon: 'fa-list-alt',      label: 'Categories' },
            { to: '/admin/brands',              icon: 'fa-tags',          label: 'Brands' },
            { to: '/admin/pending-approvals',   icon: 'fa-clock-o',       label: 'Pending Approvals' },
            { to: '/admin/users',               icon: 'fa-users',         label: 'Users' },
            { to: '/admin/sellers',             icon: 'fa-user-circle',   label: 'Sellers' },
            { to: '/admin/orders',              icon: 'fa-shopping-cart', label: 'Orders' },
            { to: '/admin/settings',            icon: 'fa-gear',          label: 'Settings' },
          ].map(({ to, icon, label }) => (
            <li key={to}>
              <NavLink to={to} className={({ isActive }) => `text-white ${isActive ? 'active' : ''}`}>
                <i className={`fa ${icon} me-2`}></i> {label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="logout-container">
          <button className="btn btn-danger w-100" onClick={logout}>
            <i className="fa fa-sign-out me-1"></i> Logout
          </button>
        </div>
      </div>

      {sidebarOpen && <div className="overlay" onClick={toggleSidebar}></div>}
    </>
  );
}

export default AdminHeader;
