// src/app/(public)/order/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/layout/Navbar';
import { sendOrderEmail } from '@/lib/email-service';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  preparation_time?: number;
}

interface CartItem extends MenuItem {
  quantity: number;
  specialInstructions?: string;
}

export default function PublicOrderPage() {
  const [restaurant, setRestaurant] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in');
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [orderData, setOrderData] = useState<any>(null); // Store full order data
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const tableParam = searchParams.get('table');

  useEffect(() => {
    if (slug) {
      fetchData();
      loadCartFromStorage();
    }
  }, [slug]);

  const fetchData = async () => {
    if (!slug) return;

    try {
      console.log('Fetching data for slug:', slug);

      // 1. Cari restaurant berdasarkan slug (normalize: trim, lowercase)
      const normalizedSlug = slug?.trim().toLowerCase() || '';
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('users')
        .select('*')
        .ilike('restaurant_slug', normalizedSlug)
        .maybeSingle();

      if (restaurantError) {
        console.error('Restaurant fetch error:', restaurantError.code, restaurantError.message, restaurantError);
        router.push('/');
        return;
      }
      if (!restaurantData) {
        console.error('Restaurant not found for slug:', normalizedSlug);
        router.push('/');
        return;
      }

      setRestaurant(restaurantData);

      const userId = restaurantData.id; // Ini ID user/restaurant

      const applyTheme = (primary?: string | null, secondary?: string | null) => {
        const root = document.documentElement;
        root.style.setProperty('--primary', primary || '#3B82F6');
        root.style.setProperty('--secondary', secondary || '#10B981');
      };

      // 2. Fetch settings - PERBAIKI QUERY INI
      const { data: settingsData, error: settingsError } = await supabase
        .from('restaurant_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (settingsError) {
        console.error('Error fetching settings:', settingsError);
        // Gunakan default settings jika tidak ada
        const fallbackSettings = {
          tax_percentage: 10,
          service_charge_percentage: 0,
          enable_online_orders: true,
          enable_table_selection: true,
          enable_delivery: true,
          delivery_fee: 0,
        };
        setSettings(fallbackSettings);
        applyTheme('#3B82F6', '#10B981');
      } else {
        setSettings(settingsData);
        // Apply theme colors immediately
        applyTheme(settingsData?.primary_color, settingsData?.secondary_color);
      }

      // 3. Fetch menu items - PERBAIKI QUERY INI
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('user_id', userId) // Gunakan userId dari restaurant
        .eq('is_available', true)
        .order('name');

      console.log('Menu items:', menuData);
      console.log('Menu error:', menuError);

      if (menuError) {
        console.error('Error fetching menu items:', menuError);
        setMenuItems([]);
      } else {
        setMenuItems(menuData || []);
      }

      // 4. Fetch tables if dine-in enabled - PERBAIKI QUERY INI
      if (settingsData?.enable_table_selection !== false) {
        const { data: tablesData, error: tablesError } = await supabase
          .from('restaurant_tables')
          .select('*')
          .eq('user_id', userId) // Gunakan userId dari restaurant
          .eq('is_available', true);

        if (tablesError) {
          console.error('Error fetching tables:', tablesError);
        } else {
          setTables(tablesData || []);
          
          // Auto-select table from URL parameter
          if (tableParam && tablesData) {
            const matchedTable = tablesData.find(
              (t) => t.table_number === tableParam || t.table_name === tableParam
            );
            if (matchedTable) {
              setSelectedTable(matchedTable.id);
            }
          }
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error in fetchData:', error);
      setLoading(false);
    }
  };

  const loadCartFromStorage = () => {
    if (typeof window !== 'undefined' && slug) {
      const savedCart = localStorage.getItem(`cart_${slug}`);
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch (error) {
          console.error('Error parsing cart from storage:', error);
        }
      }
    }
  };

  const saveCartToStorage = (cart: CartItem[]) => {
    if (typeof window !== 'undefined' && slug) {
      localStorage.setItem(`cart_${slug}`, JSON.stringify(cart));
    }
  };

  const addToCart = (item: MenuItem) => {
    const newCart = [...cart];
    const existingItem = newCart.find(i => i.id === item.id);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      newCart.push({ ...item, quantity: 1 });
    }

    setCart(newCart);
    saveCartToStorage(newCart);
  };

  const removeFromCart = (itemId: string) => {
    const newCart = cart.map(item => {
      if (item.id === itemId) {
        return { ...item, quantity: Math.max(0, item.quantity - 1) };
      }
      return item;
    }).filter(item => item.quantity > 0);

    setCart(newCart);
    saveCartToStorage(newCart);
  };

  const updateSpecialInstructions = (itemId: string, instructions: string) => {
    const newCart = cart.map(item =>
      item.id === itemId ? { ...item, specialInstructions: instructions } : item
    );

    setCart(newCart);
    saveCartToStorage(newCart);
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = subtotal * ((settings?.tax_percentage || 10) / 100);
    const serviceCharge = subtotal * ((settings?.service_charge_percentage || 0) / 100);
    const deliveryFee = orderType === 'delivery' ? (settings?.delivery_fee || 0) : 0;

    return subtotal + tax + serviceCharge + deliveryFee;
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      alert('Tambahkan minimal 1 item ke keranjang');
      return;
    }

    if (orderType === 'dine_in' && !selectedTable) {
      alert('Pilih meja untuk order dine-in');
      return;
    }

    if (orderType === 'delivery' && (!customerPhone || !deliveryAddress)) {
      alert('Isi nomor telepon dan alamat untuk delivery');
      return;
    }

    try {
      // Generate order number
      const generatedOrderNumber = `ORD-${Date.now().toString().slice(-6)}`;

      const subtotal = calculateSubtotal();
      const taxPercentage = settings?.tax_percentage || 10;
      const serviceChargePercentage = settings?.service_charge_percentage || 0;
      const deliveryFee = orderType === 'delivery' ? (settings?.delivery_fee || 0) : 0;
      
      const taxAmount = subtotal * (taxPercentage / 100);
      const serviceChargeAmount = subtotal * (serviceChargePercentage / 100);
      const totalAmount = subtotal + taxAmount + serviceChargeAmount + deliveryFee;

      const orderData = {
        user_id: restaurant.id,
        order_number: generatedOrderNumber,
        table_id: orderType === 'dine_in' ? selectedTable : null,
        order_type: orderType,
        customer_name: customerName,
        customer_phone: customerPhone,
        delivery_address: orderType === 'delivery' ? deliveryAddress : null,
        status: 'pending',
        subtotal: subtotal,
        tax_percentage: taxPercentage,
        tax_amount: taxAmount,
        service_charge_percentage: serviceChargePercentage,
        service_charge_amount: serviceChargeAmount,
        total_amount: totalAmount,
        payment_status: 'pending',
        notes,
      };

      const { data: order, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (error) throw error;

      // Insert order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        special_instructions: item.specialInstructions,
      }));

      await supabase.from('order_items').insert(orderItems);

      // Update table availability if dine-in
      if (orderType === 'dine_in' && selectedTable) {
        await supabase
          .from('restaurant_tables')
          .update({ is_available: false })
          .eq('id', selectedTable);
      }

      // Clear cart
      setCart([]);
      saveCartToStorage([]);

      // Show success message
      setOrderNumber(generatedOrderNumber);
      setOrderData(order); // Save order data
      setOrderSubmitted(true);

      // Send email notification to owner
      if (restaurant?.email) {
        await sendOrderEmail({
          email: restaurant.email,
          orderNumber: generatedOrderNumber,
          customerName: customerName || 'Tanpa nama',
          totalAmount: calculateTotal(),
          items: cart.map((item) => `${item.name} x${item.quantity}`),
        });
      }

      // Send notification (simulated)
      sendNotification(order);

    } catch (error: any) {
      console.error('Error creating order:', error);
      alert('Terjadi kesalahan saat membuat order. Silakan coba lagi.');
    }
  };

  const sendNotification = async (order: any) => {
    // In production, implement email/WhatsApp notification here
    console.log('Order created:', order);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat menu...</p>
        </div>
      </div>
    );
  }

  if (!restaurant || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Restoran tidak ditemukan</h2>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Kembali ke Halaman Utama
          </button>
        </div>
      </div>
    );
  }

  if (!settings?.enable_online_orders) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar mode="public" restaurant={restaurant} settings={settings} />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Pemesanan Online Sedang Tidak Tersedia
          </h2>
          <p className="text-gray-600">
            Silakan kunjungi restoran kami untuk memesan.
          </p>
        </div>
      </div>
    );
  }

  if (orderSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar mode="public" restaurant={restaurant} settings={settings} />
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Order Berhasil!
            </h1>
            <p className="text-gray-600 mb-8">
              Terima kasih telah memesan di {restaurant?.restaurant_name}.
              Order Anda sedang diproses.
            </p>

            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <div className="text-sm text-gray-500 mb-2">Nomor Order</div>
              <div className="text-2xl font-bold text-gray-900 mb-6">{orderNumber}</div>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <div className="text-sm text-gray-500">Tipe Order</div>
                  <div className="font-medium">
                    {orderType === 'dine_in' ? 'Dine In' :
                      orderType === 'takeaway' ? 'Takeaway' : 'Delivery'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total</div>
                  <div className="font-medium">
                    Rp {(orderData?.total_amount || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600">
                Kami akan mengirimkan notifikasi via WhatsApp jika nomor telepon Anda terdaftar.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push(`/${slug}`)}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium"
                >
                  Kembali ke Menu
                </button>
                <button
                  onClick={() => router.push(`/${slug}/invoice/${orderData.id}`)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cetak Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Navbar mode="public" restaurant={restaurant} settings={settings} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Pemesanan Online</p>
              <h1 className="text-3xl font-bold text-slate-900">{restaurant?.restaurant_name}</h1>
              <p className="mt-2 text-slate-600">
                Pilih metode order dan lengkapi detail sebelum checkout.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings?.enable_table_selection && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Dine In
                </span>
              )}
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                Takeaway
              </span>
              {settings?.enable_delivery && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Delivery
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Order Form */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Informasi Order</h2>

              {/* Order Type Selection */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Tipe Order
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {settings?.enable_table_selection && (
                    <button
                      type="button"
                      onClick={() => setOrderType('dine_in')}
                      className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center ${orderType === 'dine_in'
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <div className="text-2xl mb-2">🍽️</div>
                      <h3 className="font-semibold text-gray-900">Dine In</h3>
                      <p className="text-sm text-gray-600 mt-1">Makan di tempat</p>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOrderType('takeaway')}
                    className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center ${orderType === 'takeaway'
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="text-2xl mb-2">🥡</div>
                    <h3 className="font-semibold text-gray-900">Takeaway</h3>
                    <p className="text-sm text-gray-600 mt-1">Ambil di tempat</p>
                  </button>
                  {settings?.enable_delivery && (
                    <button
                      type="button"
                      onClick={() => setOrderType('delivery')}
                      className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center ${orderType === 'delivery'
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <div className="text-2xl mb-2">🚚</div>
                      <h3 className="font-semibold text-gray-900">Delivery</h3>
                      <p className="text-sm text-gray-600 mt-1">Antar ke alamat</p>
                    </button>
                  )}
                </div>
              </div>

              {/* Order Details */}
              <div className="space-y-6">
                {orderType === 'dine_in' && tables.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pilih Meja
                    </label>
                    <select
                      value={selectedTable}
                      onChange={(e) => setSelectedTable(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      required
                    >
                      <option value="">Pilih Meja</option>
                      {tables.map(table => (
                        <option key={table.id} value={table.id}>
                          {table.table_name || `Meja ${table.table_number}`} (Max {table.capacity} orang)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Anda
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      placeholder="Nama lengkap"
                      required={orderType !== 'dine_in'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      No. Telepon
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      placeholder="08xxxxxxxxxx"
                      required={orderType === 'delivery'}
                    />
                  </div>
                </div>

                {orderType === 'delivery' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alamat Pengiriman
                    </label>
                    <textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      rows={3}
                      placeholder="Alamat lengkap untuk pengiriman"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catatan Tambahan (Opsional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    rows={2}
                    placeholder="Contoh: Tidak pakai pedas, tambah saus, dll."
                  />
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Pilih Menu</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuItems.map(item => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        <p className="text-lg font-bold text-primary mt-2">
                          Rp {item.price.toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => addToCart(item)}
                        className="ml-2 p-2 bg-primary/10 text-primary rounded-full hover:bg-primary/20"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    </div>
                    {item.preparation_time && (
                      <div className="text-sm text-gray-500">
                        ⏱️ {item.preparation_time} menit
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Cart Summary */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 sticky top-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Keranjang</h2>

              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">🛒</div>
                  <p>Keranjang kosong</p>
                  <p className="text-sm">Tambahkan item dari menu</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {cart.map(item => (
                      <div key={item.id} className="border-b pb-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.name}</h4>
                            <p className="text-sm text-gray-600">
                              Rp {item.price.toLocaleString()} × {item.quantity}
                            </p>
                            <p className="font-medium text-gray-900">
                              Rp {(item.price * item.quantity).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                              </svg>
                            </button>
                            <span className="font-medium">{item.quantity}</span>
                            <button
                              onClick={() => addToCart(item)}
                              className="p-1 text-secondary hover:bg-secondary/10 rounded"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {item.specialInstructions && (
                          <div className="mt-2 text-sm text-gray-500">
                            Catatan: {item.specialInstructions}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Order Summary */}
                  <div className="mt-8 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span>Rp {calculateSubtotal().toLocaleString()}</span>
                    </div>

                    {settings?.tax_percentage > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Pajak ({settings.tax_percentage}%)</span>
                        <span>
                          Rp {(calculateSubtotal() * (settings.tax_percentage / 100)).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {settings?.service_charge_percentage > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Service Charge ({settings.service_charge_percentage}%)</span>
                        <span>
                          Rp {(calculateSubtotal() * (settings.service_charge_percentage / 100)).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {orderType === 'delivery' && settings?.delivery_fee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Biaya Pengiriman</span>
                        <span>Rp {settings.delivery_fee.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex justify-between font-semibold text-lg pt-3 border-t">
                      <span>Total</span>
                      <span>Rp {calculateTotal().toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitOrder}
                    className="w-full mt-8 py-4 bg-primary text-white rounded-lg font-bold text-lg hover:bg-primary/90"
                  >
                    Buat Order
                  </button>

                  <p className="mt-4 text-center text-sm text-gray-500">
                    Dengan membuat order, Anda menyetujui syarat & ketentuan kami
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}