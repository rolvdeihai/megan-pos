'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  HomeIcon,
  RectangleStackIcon,
  QueueListIcon,
  ChartBarIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  BuildingStorefrontIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  ShoppingBagIcon,
  ChevronDownIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import { useStaff } from '@/contexts/StaffContext';
import { getVisibleDashboardNavItems } from '@/lib/navigation';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const { user, logout: ownerLogout } = useAuth();
  const { staff, logout: staffLogout } = useStaff();
  const currentUser = user || staff;
  const isStaff = currentUser?.user_type === 'staff' || !!staff;
  const permissions = (currentUser as { permissions?: string[] })?.permissions ?? (isStaff ? [] : ['*']);

  const [restaurant, setRestaurant] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [employeesDropdownOpen, setEmployeesDropdownOpen] = useState(false);

  useEffect(() => {
    if (currentUser?.id) {
      fetchUserData();
    } else {
      setRestaurant(null);
      setSubscription(null);
    }
  }, [currentUser]);

  useEffect(() => {
    const isEmployeesSection =
      pathname === '/dashboard/attendance' ||
      pathname === '/dashboard/payroll' ||
      pathname === '/dashboard/roles';
    if (isEmployeesSection) {
      setEmployeesDropdownOpen(true);
    }
  }, [pathname]);

  const fetchUserData = async () => {
    if (!currentUser) return;
    const ownerId =
      currentUser.user_type === 'staff'
        ? (currentUser as { user_id?: string }).user_id
        : currentUser.id;

    const { data: restaurantData } = await supabase
      .from('users')
      .select('*')
      .eq('id', ownerId)
      .single();
    setRestaurant(restaurantData);

    const { data: subscriptionData } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', ownerId)
      .eq('status', 'active')
      .maybeSingle();
    setSubscription(subscriptionData);
  };

  const handleLogout = async () => {
    if (isStaff) {
      await staffLogout();
    } else {
      await ownerLogout();
    }
    router.push('/login');
  };

  const iconMap: Record<string, typeof HomeIcon> = {
    '/dashboard': HomeIcon,
    '/dashboard/menu': RectangleStackIcon,
    '/dashboard/orders': ShoppingBagIcon,
    '/dashboard/transactions': ChartBarIcon,
    '/dashboard/inventory': BuildingStorefrontIcon,
    '/dashboard/employees': UserGroupIcon,
    '/dashboard/settings': Cog6ToothIcon,
    '/dashboard/billing': CreditCardIcon,
    '/dashboard/tables': QueueListIcon,
    '/dashboard/public-orders': GlobeAltIcon,
  };

  const navigation = getVisibleDashboardNavItems(permissions);

  const employeesSubItems = [
    { href: '/dashboard/employees', label: 'Daftar Pegawai', icon: UserGroupIcon },
    { href: '/dashboard/attendance', label: 'Absensi', icon: ClockIcon },
    { href: '/dashboard/payroll', label: 'Payroll', icon: CurrencyDollarIcon },
    { href: '/dashboard/roles', label: 'Roles', icon: ShieldCheckIcon },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72
          bg-slate-900 shadow-2xl transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          flex flex-col
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-700/50 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Megan POS</h1>
              <p className="text-[11px] text-slate-400 truncate max-w-[160px]">
                {restaurant?.restaurant_name || 'Restaurant'}
              </p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* User card */}
        <div className="px-4 py-4 border-b border-slate-700/50 shrink-0">
          <div className="flex items-center gap-3 rounded-xl bg-slate-800/60 p-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
              <span className="text-primary font-semibold text-sm">
                {(currentUser?.full_name || currentUser?.email || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">
                {currentUser?.full_name || currentUser?.email || 'Loading...'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    subscription
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {subscription ? 'Pro' : 'Free'}
                </span>
                {restaurant?.restaurant_slug && (
                  <a
                    href={`/${restaurant.restaurant_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary hover:text-primary/80 font-medium"
                  >
                    Lihat Web
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const ItemIcon = iconMap[item.href] || HomeIcon;

            if (item.href === '/dashboard/employees') {
              const isEmployeesSection =
                pathname === '/dashboard/employees' ||
                pathname === '/dashboard/attendance' ||
                pathname === '/dashboard/payroll' ||
                pathname === '/dashboard/roles';

              return (
                <div key={item.href}>
                  <button
                    onClick={() => setEmployeesDropdownOpen(!employeesDropdownOpen)}
                    className={`
                      flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-xl
                      transition-all duration-200
                      ${
                        isEmployeesSection
                          ? 'bg-primary/15 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }
                    `}
                  >
                    <ItemIcon
                      className={`w-5 h-5 mr-3 shrink-0 ${
                        isEmployeesSection ? 'text-primary' : 'text-slate-500'
                      }`}
                    />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDownIcon
                      className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                        employeesDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-200 ${
                      employeesDropdownOpen ? 'max-h-48 mt-1' : 'max-h-0'
                    }`}
                  >
                    <div className="ml-3 pl-3 border-l border-slate-700/50 space-y-0.5">
                      {employeesSubItems.map((sub) => {
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => {
                              if (window.innerWidth < 1024) onClose();
                            }}
                            className={`
                              flex items-center px-3 py-2 text-sm rounded-lg
                              transition-all duration-200
                              ${
                                isSubActive
                                  ? 'bg-primary/10 text-white font-medium'
                                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                              }
                            `}
                          >
                            <sub.icon
                              className={`w-4 h-4 mr-2.5 shrink-0 ${
                                isSubActive ? 'text-primary' : 'text-slate-500'
                              }`}
                            />
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`
                  flex items-center px-3 py-2.5 text-sm font-medium rounded-xl
                  transition-all duration-200
                  ${
                    isActive
                      ? 'bg-primary/15 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <ItemIcon
                  className={`w-5 h-5 mr-3 shrink-0 ${
                    isActive ? 'text-primary' : 'text-slate-500'
                  }`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-700/50 shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
