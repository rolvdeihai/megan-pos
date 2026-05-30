'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  HomeIcon,
  ClipboardDocumentListIcon,
  TableCellsIcon,
  ShoppingBagIcon,
  ChartBarIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { getUserRoleLabel, getVisibleDashboardNavItems } from '@/lib/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { useStaff } from '@/contexts/StaffContext';

interface NavbarProps {
  mode: 'dashboard' | 'public';
  restaurant?: any;
  settings?: any;
  showAuthControls?: boolean;
}

// Mapping ikon untuk setiap link (optional, untuk menambah estetika)
const iconMap: Record<string, any> = {
  Dashboard: HomeIcon,
  Orders: ShoppingBagIcon,
  Menu: ClipboardDocumentListIcon,
  Tables: TableCellsIcon,
  Transactions: ChartBarIcon,
  Employees: UserGroupIcon,
  Settings: Cog6ToothIcon,
  Billing: CreditCardIcon,
  Inventory: ClipboardDocumentListIcon,
};

export default function Navbar({ mode, restaurant, settings, showAuthControls = true }: NavbarProps) {
  const pathname = usePathname();
  const { user, logout: ownerLogout } = useAuth();
  const { staff, logout: staffLogout } = useStaff();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [employeesDropdownOpen, setEmployeesDropdownOpen] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isHovered, setIsHovered] = useState<string | null>(null);

  const currentUser = user || staff;
  const isStaff = currentUser?.user_type === 'staff' || !!staff;

  useEffect(() => {
    if (!currentUser) {
      setPermissions([]);
      return;
    }
    const currentPermissions = (currentUser as { permissions?: string[] }).permissions;
    if (Array.isArray(currentPermissions)) {
      setPermissions(currentPermissions);
      return;
    }
    if (!isStaff) {
      setPermissions(['*']);
      return;
    }
    setPermissions([]);
  }, [currentUser, isStaff]);

  useEffect(() => {
    const isEmployeesSection =
      pathname === '/dashboard/attendance' ||
      pathname === '/dashboard/payroll' ||
      pathname === '/dashboard/roles';
    if (isEmployeesSection) {
      setEmployeesDropdownOpen(true);
    }
  }, [pathname]);

  const handleLogout = async () => {
    if (isStaff) {
      await staffLogout();
    } else {
      await ownerLogout();
    }
  };

  const filteredLinks = getVisibleDashboardNavItems(permissions);
  const roleLabel = getUserRoleLabel(currentUser as {
    user_type?: 'owner' | 'staff';
    role_name?: string | null;
    role?: string | null;
  });

  // Helper untuk mendapatkan ikon
  const getIcon = (label: string) => {
    const IconComponent = iconMap[label];
    return IconComponent ? <IconComponent className="w-5 h-5" /> : null;
  };

  // ==================== PUBLIC MODE (tidak banyak berubah, hanya perbaikan minor) ====================
  if (mode === 'public') {
    return (
      <nav
        className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-sm"
        style={{ borderTop: `4px solid ${settings?.primary_color || '#2563EB'}` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt={restaurant?.restaurant_name} className="h-10 w-10 rounded-xl object-cover shadow-md" />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-lg shadow-inner">
                  🍽️
                </div>
              )}
              <div>
                <Link href={`/${restaurant?.restaurant_slug}`} className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  {restaurant?.restaurant_name || 'Restaurant'}
                </Link>
                <div className="text-xs text-slate-500">{settings?.business_hours ? 'Buka hari ini' : 'Pemesanan online'}</div>
              </div>
            </div>
            {showAuthControls && (
              <>
                <div className="hidden md:flex items-center gap-4">
                  {currentUser ? (
                    <>
                      <Link
                        href="/dashboard"
                        className="px-4 py-2 text-sm font-medium text-slate-700 rounded-full hover:bg-primary/10 hover:text-primary transition-all duration-200"
                      >
                        Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-sm font-medium text-red-600 rounded-full hover:bg-red-50 transition-all duration-200"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      {restaurant?.restaurant_slug && (
                        <Link
                          href={`/${restaurant.restaurant_slug}/staff-login`}
                          className="px-4 py-2 text-sm font-medium text-slate-700 rounded-full hover:bg-primary/10 hover:text-primary transition-all duration-200"
                        >
                          Login Staff
                        </Link>
                      )}
                      <Link
                        href="/login"
                        className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-primary to-primary/80 rounded-full shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        Masuk Owner
                      </Link>
                    </>
                  )}
                </div>
                <button className="md:hidden p-2 text-slate-600 rounded-lg hover:bg-slate-100" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                  <Bars3Icon className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>
        <AnimatePresence>
          {isMobileMenuOpen && showAuthControls && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-slate-200/80 bg-white/95 px-4 py-4 space-y-3 overflow-hidden"
            >
              {currentUser ? (
                <>
                  <Link href="/dashboard" className="block px-4 py-2 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-50" onClick={() => setIsMobileMenuOpen(false)}>
                    Dashboard
                  </Link>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  {restaurant?.restaurant_slug && (
                    <Link href={`/${restaurant.restaurant_slug}/staff-login`} className="block px-4 py-2 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-50" onClick={() => setIsMobileMenuOpen(false)}>
                      Login Staff
                    </Link>
                  )}
                  <Link href="/login" className="block px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg text-center" onClick={() => setIsMobileMenuOpen(false)}>
                    Masuk Owner
                  </Link>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    );
  }

  // ==================== DASHBOARD MODE (Sidebar yang sudah di-restyle) ====================
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Animasi untuk menu item
  const menuItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
  };

  const renderNavItems = () => (
    <motion.div
      className="flex-1 py-6 space-y-1.5 overflow-y-auto"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
    >
      {filteredLinks.map((link) => {
        const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`);
        const IconComponent = getIcon(link.label);

        // Employees dropdown
        if (link.href === '/dashboard/employees') {
          const isEmployeesActive =
            pathname === '/dashboard/employees' ||
            pathname === '/dashboard/attendance' ||
            pathname === '/dashboard/payroll' ||
            pathname === '/dashboard/roles';

          return (
            <motion.div key={link.href} variants={menuItemVariants} className="px-3">
              <button
                onClick={() => setEmployeesDropdownOpen(!employeesDropdownOpen)}
                className={`group flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                  isEmployeesActive
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  {IconComponent && <span className="text-current">{IconComponent}</span>}
                  <span>{link.label}</span>
                </div>
                <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${employeesDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {employeesDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-6 mt-1 space-y-1 overflow-hidden"
                  >
                    {['/dashboard/employees', '/dashboard/attendance', '/dashboard/payroll', '/dashboard/roles'].map((subPath) => {
                      const subLabel = subPath.split('/').pop();
                      const subActive = pathname === subPath;
                      return (
                        <Link
                          key={subPath}
                          href={subPath}
                          onClick={closeMobileMenu}
                          className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                            subActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                          }`}
                        >
                          {subLabel === 'employees' ? 'Employees' : subLabel === 'attendance' ? 'Attendance' : subLabel === 'payroll' ? 'Payroll' : 'Roles'}
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        }

        // Regular link
        return (
          <motion.div key={link.href} variants={menuItemVariants} className="px-3">
            <Link
              href={link.href}
              onClick={closeMobileMenu}
              onMouseEnter={() => setIsHovered(link.href)}
              onMouseLeave={() => setIsHovered(null)}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {IconComponent && (
                <span className={`${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-500'} transition-colors duration-200`}>
                  {IconComponent}
                </span>
              )}
              <span>{link.label}</span>
              {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className="ml-auto w-1 h-5 rounded-full bg-primary"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );

  const renderUserSection = () => (
    <div className="border-t border-slate-200/60 p-4 bg-gradient-to-b from-white to-slate-50/50">
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar dengan inisial atau logo kecil */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-semibold shadow-sm">
          {currentUser?.full_name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{currentUser?.full_name || 'User'}</p>
          <p className="text-xs text-slate-500 truncate">{roleLabel}</p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-all duration-200"
      >
        <ArrowRightOnRectangleIcon className="w-4 h-4" />
        <span>Logout</span>
      </button>
    </div>
  );

  return (
    <>
      {/* Tombol hamburger mobile */}
      <button
        className="fixed top-4 left-4 z-50 p-2.5 bg-white rounded-xl shadow-lg md:hidden backdrop-blur-sm hover:bg-slate-50 transition-all duration-200"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Bars3Icon className="w-5 h-5 text-slate-600" />
      </button>

      {/* Sidebar */}
      <AnimatePresence>
        {(isMobileMenuOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            className={`fixed top-0 left-0 z-40 h-full w-64 bg-white/95 backdrop-blur-md border-r border-slate-200/60 shadow-2xl flex flex-col ${
              typeof window !== 'undefined' && window.innerWidth >= 768 ? 'translate-x-0' : ''
            }`}
            style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }}
          >
            {/* Header Sidebar dengan Logo */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/60 bg-gradient-to-r from-white to-slate-50/50">
              <Link href="/dashboard" className="flex items-center gap-2 group" onClick={closeMobileMenu}>
                <div className="relative w-8 h-8">
                  <Image
                    src="/icon-source.png"
                    alt="Logo"
                    width={32}
                    height={32}
                    className="object-contain rounded-lg transition-transform group-hover:scale-105"
                  />
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  JetNote Pos
                </span>
              </Link>
              <button className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 transition-colors" onClick={closeMobileMenu}>
                <XMarkIcon className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Navigasi */}
            {renderNavItems()}

            {/* User & Logout */}
            {renderUserSection()}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Overlay mobile */}
      {isMobileMenuOpen && typeof window !== 'undefined' && window.innerWidth < 768 && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden" onClick={closeMobileMenu} />
      )}

      {/* Spacer global untuk konten utama */}
      <style jsx global>{`
        @media (min-width: 768px) {
          body {
            margin-left: 256px;
          }
        }
        @media (max-width: 767px) {
          body {
            margin-left: 0;
          }
        }
      `}</style>
    </>
  );
}