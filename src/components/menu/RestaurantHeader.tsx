'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  ShoppingCartIcon, 
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  HomeIcon,
  QueueListIcon,
  UserIcon,
  XMarkIcon,
  Bars3Icon
} from '@heroicons/react/24/outline';

interface RestaurantHeaderProps {
  restaurant: any;
  settings: any;
}

export default function RestaurantHeader({ restaurant, settings }: RestaurantHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [cart, setCart] = useState<any[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    // Load cart from localStorage
    const loadCart = () => {
      if (typeof window !== 'undefined' && restaurant?.restaurant_slug) {
        const savedCart = localStorage.getItem(`cart_${restaurant.restaurant_slug}`);
        if (savedCart) {
          setCart(JSON.parse(savedCart));
        }
      }
    };

    loadCart();

    // Check if restaurant is open
    if (settings?.business_hours) {
      checkBusinessHours();
    }

    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (settings?.business_hours) {
        checkBusinessHours();
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [restaurant, settings]);

  const checkBusinessHours = () => {
    if (!settings?.business_hours) {
      setIsOpen(true);
      return;
    }

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[currentTime.getDay()];
    const hours = settings.business_hours[today];

    if (!hours || hours.open === 'closed' || hours.close === 'closed') {
      setIsOpen(false);
      return;
    }

    const [openHour, openMinute] = hours.open.split(':').map(Number);
    const [closeHour, closeMinute] = hours.close.split(':').map(Number);

    const now = currentTime;
    const openTime = new Date();
    openTime.setHours(openHour, openMinute, 0);
    const closeTime = new Date();
    closeTime.setHours(closeHour, closeMinute, 0);

    setIsOpen(now >= openTime && now <= closeTime);
  };

  const calculateCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const updateCartQuantity = (itemId: string, change: number) => {
    const newCart = cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = item.quantity + change;
        if (newQuantity <= 0) return null;
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item !== null);

    setCart(newCart);
    if (restaurant?.restaurant_slug) {
      localStorage.setItem(`cart_${restaurant.restaurant_slug}`, JSON.stringify(newCart));
    }
  };

  const removeFromCart = (itemId: string) => {
    const newCart = cart.filter(item => item.id !== itemId);
    setCart(newCart);
    if (restaurant?.restaurant_slug) {
      localStorage.setItem(`cart_${restaurant.restaurant_slug}`, JSON.stringify(newCart));
    }
  };

  const clearCart = () => {
    setCart([]);
    if (restaurant?.restaurant_slug) {
      localStorage.removeItem(`cart_${restaurant.restaurant_slug}`);
    }
  };

  const proceedToCheckout = () => {
    setCartOpen(false);
    router.push(`/${restaurant?.restaurant_slug}/order`);
  };

  const getDayName = (day: string) => {
    const days: { [key: string]: string } = {
      monday: 'Senin',
      tuesday: 'Selasa',
      wednesday: 'Rabu',
      thursday: 'Kamis',
      friday: 'Jumat',
      saturday: 'Sabtu',
      sunday: 'Minggu',
    };
    return days[day] || day;
  };

  const currentDay = () => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[currentTime.getDay()];
  };

  const todayHours = settings?.business_hours?.[currentDay()];

  return (
    <>
      {/* Top bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and name */}
            <div className="flex items-center">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 mr-2 lg:hidden text-gray-500 hover:text-gray-700"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>
              
              <Link href={`/${restaurant?.restaurant_slug}`} className="flex items-center">
                {settings?.logo_url ? (
                  <img
                    src={settings.logo_url}
                    alt={restaurant?.restaurant_name}
                    className="h-10 w-10 rounded-lg object-cover mr-3"
                  />
                ) : (
                  <div 
                    className="h-10 w-10 rounded-lg flex items-center justify-center mr-3"
                    style={{ backgroundColor: settings?.primary_color || '#3B82F6' }}
                  >
                    <span className="text-white font-bold text-lg">
                      {restaurant?.restaurant_name?.charAt(0) || 'R'}
                    </span>
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {restaurant?.restaurant_name || 'Restoran'}
                  </h1>
                  <div className="flex items-center text-sm text-gray-600">
                    {isOpen ? (
                      <span className="flex items-center text-green-600">
                        <ClockIcon className="w-3 h-3 mr-1" />
                        Buka Sekarang
                      </span>
                    ) : (
                      <span className="flex items-center text-red-600">
                        <ClockIcon className="w-3 h-3 mr-1" />
                        Sedang Tutup
                      </span>
                    )}
                    {todayHours && (
                      <span className="ml-2">
                        {todayHours.open === 'closed' ? 'Tutup' : `${todayHours.open} - ${todayHours.close}`}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <Link
                href={`/${restaurant?.restaurant_slug}`}
                className={`text-sm font-medium transition-colors ${
                  pathname === `/${restaurant?.restaurant_slug}`
                    ? 'text-blue-600'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <HomeIcon className="w-4 h-4 inline mr-1" />
                Beranda
              </Link>
              
              <Link
                href={`/${restaurant?.restaurant_slug}/menu`}
                className={`text-sm font-medium transition-colors ${
                  pathname.includes('/menu')
                    ? 'text-blue-600'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <QueueListIcon className="w-4 h-4 inline mr-1" />
                Menu
              </Link>
              
              {settings?.enable_online_orders && (
                <Link
                  href={`/${restaurant?.restaurant_slug}/order`}
                  className={`text-sm font-medium transition-colors ${
                    pathname.includes('/order')
                      ? 'text-blue-600'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  <ShoppingCartIcon className="w-4 h-4 inline mr-1" />
                  Order Online
                </Link>
              )}

              {restaurant?.phone && (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center"
                >
                  <PhoneIcon className="w-4 h-4 mr-1" />
                  {restaurant.phone}
                </a>
              )}
            </nav>

            {/* Cart and CTA */}
            <div className="flex items-center space-x-4">
              {settings?.enable_online_orders && (
                <button
                  onClick={() => setCartOpen(true)}
                  className="relative p-2 text-gray-700 hover:text-gray-900"
                >
                  <ShoppingCartIcon className="w-6 h-6" />
                  {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)}
                    </span>
                  )}
                </button>
              )}

              {settings?.enable_online_orders && cart.length > 0 && (
                <button
                  onClick={proceedToCheckout}
                  className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg font-medium text-white"
                  style={{ backgroundColor: settings?.primary_color || '#3B82F6' }}
                >
                  <ShoppingCartIcon className="w-4 h-4 mr-2" />
                  Checkout (Rp {calculateCartTotal().toLocaleString()})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
            <div className="flex items-center justify-between h-16 px-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <XMarkIcon className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <div className="py-4">
              <Link
                href={`/${restaurant?.restaurant_slug}`}
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                <HomeIcon className="w-5 h-5 mr-3 text-gray-400" />
                Beranda
              </Link>
              
              <Link
                href={`/${restaurant?.restaurant_slug}/menu`}
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                <QueueListIcon className="w-5 h-5 mr-3 text-gray-400" />
                Menu
              </Link>
              
              {settings?.enable_online_orders && (
                <Link
                  href={`/${restaurant?.restaurant_slug}/order`}
                  className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ShoppingCartIcon className="w-5 h-5 mr-3 text-gray-400" />
                  Order Online
                </Link>
              )}
              
              {restaurant?.phone && (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <PhoneIcon className="w-5 h-5 mr-3 text-gray-400" />
                  {restaurant.phone}
                </a>
              )}
            </div>

            {/* Business Hours */}
            {settings?.business_hours && (
              <div className="px-4 py-4 border-t">
                <h3 className="font-medium text-gray-900 mb-2">Jam Operasional</h3>
                <div className="space-y-2 text-sm">
                  {Object.entries(settings.business_hours).map(([day, hours]: [string, any]) => (
                    <div key={day} className="flex justify-between">
                      <span className="text-gray-600">{getDayName(day)}</span>
                      <span className="font-medium">
                        {hours.open === 'closed' ? 'Tutup' : `${hours.open} - ${hours.close}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cart Sidebar */}
      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setCartOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-full sm:w-96 bg-white shadow-xl">
            <div className="flex flex-col h-full">
              {/* Cart header */}
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">Keranjang Anda</h2>
                <button
                  onClick={() => setCartOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <XMarkIcon className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              {/* Cart items */}
              <div className="flex-1 overflow-y-auto p-6">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCartIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">Keranjang Anda kosong</p>
                    <Link
                      href={`/${restaurant?.restaurant_slug}/menu`}
                      className="inline-block mt-4 text-blue-600 hover:text-blue-700"
                      onClick={() => setCartOpen(false)}
                    >
                      Lihat menu →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center border-b pb-4">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.name}</h4>
                          <p className="text-sm text-gray-600">
                            Rp {item.price.toLocaleString()} × {item.quantity}
                          </p>
                          <p className="font-medium text-gray-900">
                            Rp {(item.price * item.quantity).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => updateCartQuantity(item.id, -1)}
                            className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded"
                          >
                            <span className="text-gray-600">-</span>
                          </button>
                          <span className="font-medium w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.id, 1)}
                            className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded"
                          >
                            <span className="text-gray-600">+</span>
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="ml-2 text-red-600 hover:text-red-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart summary and actions */}
              {cart.length > 0 && (
                <div className="p-6 border-t">
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span>Rp {calculateCartTotal().toLocaleString()}</span>
                    </div>
                    
                    {settings?.tax_percentage > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Pajak ({settings.tax_percentage}%)</span>
                        <span>
                          Rp {(calculateCartTotal() * (settings.tax_percentage / 100)).toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between font-semibold text-lg pt-3 border-t">
                      <span>Total</span>
                      <span>
                        Rp {(calculateCartTotal() * (1 + (settings?.tax_percentage || 0) / 100)).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={proceedToCheckout}
                      className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                    >
                      Lanjut ke Checkout
                    </button>
                    <button
                      onClick={clearCart}
                      className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                    >
                      Kosongkan Keranjang
                    </button>
                    <button
                      onClick={() => setCartOpen(false)}
                      className="w-full py-3 text-gray-600 hover:text-gray-700"
                    >
                      Lanjut Belanja
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}