import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { logoVariants } from '@/animations/globalVariants';
import brandLogo from '@/assets/brandLogo.png';
import ThemeToggle from '@/components/ThemeToggle';
import '@/style/SellerHeader.css';

function SellerHeader() {
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const linkClass = ({ isActive }) => `text-white sidebar-link ${isActive ? 'active' : ''}`;

  return (
    <>
      <nav className="navbar navbar-light sticky-top seller-navbar">
        <div className="container-fluid">
          <div className="d-flex align-items-center">
            <motion.img src={brandLogo} alt="logo" className="me-2" variants={logoVariants} initial="hidden" animate="visible" drag dragConstraints={{ left: 0, top: 0, bottom: 0, right: 0 }} />
            <span className="text-white fw-bold ms-2">
              GON<span style={{ color: '#fbbf24' }}>EP</span> <span className="fw-normal opacity-75 small">Seller</span>
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

      <div className={`seller-sidebar sidebar bg-dark text-white ${sidebarOpen ? 'open' : ''} d-flex flex-column`}>
        <ul className="py-1 px-0 flex-grow-1">
          {[
            { to: '/seller/dashboard',  icon: 'fa-tachometer',    label: 'Dashboard' },
            { to: '/seller/products',   icon: 'fa-cube',          label: 'Products' },
            { to: '/seller/orders',     icon: 'fa-shopping-cart', label: 'Orders' },
            { to: '/seller/earnings',   icon: 'fa-money',         label: 'Earnings' },
            { to: '/seller/categories', icon: 'fa-list-alt',      label: 'Request Category' },
            { to: '/seller/brands',     icon: 'fa-tags',          label: 'Request Brand' },
            { to: '/seller/profile',    icon: 'fa-user-circle',   label: 'Profile' },
          ].map(({ to, icon, label }) => (
            <li key={to}>
              <NavLink to={to} className={linkClass}>
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

export default SellerHeader;
