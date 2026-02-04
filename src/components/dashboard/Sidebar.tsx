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
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider'; // Import useAuth

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Gunakan useAuth hook
  const { user } = useAuth();

  const [restaurant, setRestaurant] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      fetchUserData();
    } else {
      // Reset state jika user logout
      setRestaurant(null);
      setSubscription(null);
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    // Fetch restaurant data
    const { data: restaurantData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    setRestaurant(restaurantData);

    // Fetch subscription data
    const { data: subscriptionData } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    setSubscription(subscriptionData);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Menu', href: '/dashboard/menu', icon: RectangleStackIcon },
    { name: 'Orders', href: '/dashboard/orders', icon: ShoppingBagIcon },
    { name: 'Transactions', href: '/dashboard/transactions', icon: ChartBarIcon },
    { name: 'Inventory', href: '/dashboard/inventory', icon: BuildingStorefrontIcon },
    { name: 'Employees', href: '/dashboard/employees', icon: UserGroupIcon },
    { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
    { name: 'Billing', href: '/dashboard/billing', icon: CreditCardIcon },
  ];

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
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
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
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-blue-600 font-semibold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.email || 'Loading...'}
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
                  className="ml-2 text-xs text-blue-600 hover:text-blue-800"
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
            return (
              <Link
                key={item.name}
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
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <item.icon className={`w-5 h-5 mr-3 ${
                  isActive ? 'text-blue-600' : 'text-gray-400'
                }`} />
                {item.name}
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