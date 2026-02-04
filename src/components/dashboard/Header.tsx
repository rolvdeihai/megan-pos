'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bars3Icon, 
  BellIcon, 
  UserCircleIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider'; // Import useAuth

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  // Gunakan useAuth hook
  const { user } = useAuth();
  
  const [restaurant, setRestaurant] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      fetchRestaurantData();
      fetchNotifications();
    }
  }, [user]);

  useEffect(() => {
    // Listen for new orders (real-time)
    // Hanya subscribe jika user ada
    if (!user?.id) return;

    const channel = supabase
      .channel('orders-header')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`, // Filter hanya order user ini
        },
        (payload) => {
          // Add new notification
          const newNotification = {
            id: payload.new.id,
            type: 'new_order',
            title: 'Order Baru',
            message: `Order #${payload.new.order_number} telah dibuat`,
            time: new Date().toISOString(),
            read: false,
          };
          
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchRestaurantData = async () => {
    if (!user) return;

    const { data: restaurantData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    setRestaurant(restaurantData);
  };

  const fetchNotifications = async () => {
    // In a real app, fetch from database
    const mockNotifications = [
      {
        id: '1',
        type: 'system',
        title: 'Welcome to Megan POS',
        message: 'Selamat datang di sistem restoran Anda!',
        time: '2024-01-01T10:00:00Z',
        read: true,
      },
      {
        id: '2',
        type: 'order',
        title: 'Order Selesai',
        message: 'Order #ORD-001234 telah selesai',
        time: '2024-01-01T09:30:00Z',
        read: false,
      },
    ];

    setNotifications(mockNotifications);
    setUnreadCount(mockNotifications.filter(n => !n.read).length);
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
    setShowNotifications(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const formatTime = (timeString: string) => {
    const time = new Date(timeString);
    const now = new Date();
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    
    return time.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section */}
          <div className="flex items-center">
            <button
              onClick={onMenuClick}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 lg:hidden"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            
            <div className="ml-4 lg:ml-0">
              <h1 className="text-lg font-semibold text-gray-900">
                {restaurant?.restaurant_name || 'Dashboard'}
              </h1>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 relative"
              >
                <BellIcon className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Notifikasi</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            Tandai semua dibaca
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          Tidak ada notifikasi
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                              !notification.read ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => {
                              // Handle notification click
                              setShowNotifications(false);
                            }}
                          >
                            <div className="flex items-start">
                              <div className={`w-2 h-2 mt-1.5 rounded-full mr-3 ${
                                notification.read ? 'bg-gray-300' : 'bg-blue-500'
                              }`} />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-2">
                                  {formatTime(notification.time)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="p-4 border-t">
                      <a
                        href="/dashboard/orders"
                        className="block text-center text-sm text-blue-600 hover:text-blue-700"
                        onClick={() => setShowNotifications(false)}
                      >
                        Lihat semua notifikasi
                      </a>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-lg transition-colors duration-150"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserCircleIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                    {user?.email || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
                <ChevronDownIcon className="w-4 h-4 text-gray-400 hidden md:block" />
              </button>

              {showProfileMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
                    <div className="p-2">
                      <div className="px-3 py-2 border-b">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user?.email}
                        </p>
                        <p className="text-xs text-gray-500">Owner</p>
                      </div>
                      
                      <a
                        href="/dashboard/settings"
                        className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <Cog6ToothIcon className="w-4 h-4 mr-2" />
                        Pengaturan
                      </a>
                      
                      <a
                        href="/dashboard/billing"
                        className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <CreditCardIcon className="w-4 h-4 mr-2" />
                        Langganan
                      </a>
                      
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded mt-1"
                      >
                        <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}