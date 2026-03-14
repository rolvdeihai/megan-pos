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
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider'; // Import useAuth
import { useStaff } from '@/contexts/StaffContext';
import { getVisibleDashboardNavItems } from '@/lib/navigation';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Gunakan useAuth hook
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
      // Reset state jika user logout
      setRestaurant(null);
      setSubscription(null);
    }
  }, [currentUser]);

  // Auto-expand Employees dropdown when in employees section
  useEffect(() => {
    const isEmployeesSection = pathname === '/dashboard/attendance' || 
      pathname === '/dashboard/payroll' || 
      pathname === '/dashboard/roles';
    if (isEmployeesSection) {
      setEmployeesDropdownOpen(true);
    }
  }, [pathname]);

  const fetchUserData = async () => {
    if (!currentUser) return;
    const ownerId = currentUser.user_type === 'staff'
      ? (currentUser as { user_id?: string }).user_id
      : currentUser.id;

    // Fetch restaurant data
    const { data: restaurantData } = await supabase
      .from('users')
      .select('*')
      .eq('id', ownerId)
      .single();

    setRestaurant(restaurantData);

    // Fetch subscription data
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
  };

  const navigation = getVisibleDashboardNavItems(permissions);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform
        bg-white shadow-xl transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold">M</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Megan POS</h1>
              <p className="text-xs text-gray-500 truncate max-w-[150px]">
                {restaurant?.restaurant_name || 'Restoran'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-md"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* User info */}
        <div className="p-4 border-b">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
              <span className="text-primary font-semibold">
                {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {currentUser?.email || 'Loading...'}
              </p>
              <div className="flex items-center">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  subscription ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {subscription ? 'Pro' : 'Free'}
                </span>
                <a
                  href={`/${restaurant?.restaurant_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-xs text-primary hover:text-primary"
                >
                  Lihat Website
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const ItemIcon = iconMap[item.href] || HomeIcon;
            
            // Special handling for Employees dropdown
            if (item.href === '/dashboard/employees') {
              const isEmployeesSection = pathname === '/dashboard/employees' || 
                pathname === '/dashboard/attendance' || 
                pathname === '/dashboard/payroll' || 
                pathname === '/dashboard/roles';
              
              return (
                <div key={item.href}>
                  <button
                    onClick={() => setEmployeesDropdownOpen(!employeesDropdownOpen)}
                    className={`
                      flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg
                      transition-colors duration-150 ease-in-out
                      ${isEmployeesSection
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <ItemIcon className={`w-5 h-5 mr-3 ${
                      isEmployeesSection ? 'text-primary' : 'text-gray-400'
                    }`} />
                    <span className="flex-1">{item.label}</span>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${
                      employeesDropdownOpen ? 'rotate-180' : ''
                    }`} />
                  </button>
                  
                  {employeesDropdownOpen && (
                    <div className="mt-1 ml-4 space-y-1">
                      <Link
                        href="/dashboard/employees"
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onClose();
                          }
                        }}
                        className={`
                          flex items-center px-3 py-2 text-sm font-medium rounded-lg
                          transition-colors duration-150 ease-in-out
                          ${pathname === '/dashboard/employees'
                            ? 'bg-primary/10 text-primary'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }
                        `}
                      >
                        <UserGroupIcon className="w-4 h-4 mr-3 text-gray-400" />
                        Employees
                      </Link>
                      <Link
                        href="/dashboard/attendance"
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onClose();
                          }
                        }}
                        className={`
                          flex items-center px-3 py-2 text-sm font-medium rounded-lg
                          transition-colors duration-150 ease-in-out
                          ${pathname === '/dashboard/attendance'
                            ? 'bg-primary/10 text-primary'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }
                        `}
                      >
                        <ClockIcon className="w-4 h-4 mr-3 text-gray-400" />
                        Attendance
                      </Link>
                      <Link
                        href="/dashboard/payroll"
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onClose();
                          }
                        }}
                        className={`
                          flex items-center px-3 py-2 text-sm font-medium rounded-lg
                          transition-colors duration-150 ease-in-out
                          ${pathname === '/dashboard/payroll'
                            ? 'bg-primary/10 text-primary'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }
                        `}
                      >
                        <CurrencyDollarIcon className="w-4 h-4 mr-3 text-gray-400" />
                        Payroll
                      </Link>
                      <Link
                        href="/dashboard/roles"
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onClose();
                          }
                        }}
                        className={`
                          flex items-center px-3 py-2 text-sm font-medium rounded-lg
                          transition-colors duration-150 ease-in-out
                          ${pathname === '/dashboard/roles'
                            ? 'bg-primary/10 text-primary'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }
                        `}
                      >
                        <ShieldCheckIcon className="w-4 h-4 mr-3 text-gray-400" />
                        Roles
                      </Link>
                    </div>
                  )}
                </div>
              );
            }
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    onClose();
                  }
                }}
                className={`
                  flex items-center px-3 py-2 text-sm font-medium rounded-lg
                  transition-colors duration-150 ease-in-out
                  ${isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <ItemIcon className={`w-5 h-5 mr-3 ${
                  isActive ? 'text-primary' : 'text-gray-400'
                }`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout button */}
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </div>
    </>
  );
}