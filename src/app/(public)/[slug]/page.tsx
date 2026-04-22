// src/app/(public)/order/page.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/layout/Navbar';
import { sendOrderEmail } from '@/lib/email-service';
import { buildTableAvailability, checkTableConflict, type TableOrderStatus } from '@/lib/table-availability';
import { applyIngredientAvailability } from '@/lib/menu-availability';
import { combineReservationDateTime, getLocalDateInput, getLocalTimeInput } from '@/lib/reservation-datetime';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available?: boolean;
  effective_is_available?: boolean;
  sold_out_reason?: string | null;
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
  const [activeTableOrders, setActiveTableOrders] = useState<TableOrderStatus[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [orderData, setOrderData] = useState<any>(null); // Store full order data
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateInput());
  const [selectedHour, setSelectedHour] = useState<string>(() => getLocalTimeInput());
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const tableParam = searchParams.get('table');
  const selectedTime = combineReservationDateTime(selectedDate, selectedHour);
  const effectiveSelectedTime = selectedTime || combineReservationDateTime(getLocalDateInput(), getLocalTimeInput());
  const tableOptions = useMemo(
    () => buildTableAvailability(tables, activeTableOrders, effectiveSelectedTime),
    [tables, activeTableOrders, effectiveSelectedTime]
  );

  useEffect(() => {
    if (!selectedTable) return;
    const selectedTableOption = tableOptions.find((table) => table.id === selectedTable);
    if (selectedTableOption && !selectedTableOption.is_selectable) {
      setSelectedTable('');
    }
  }, [selectedTable, tableOptions]);

  useEffect(() => {
    if (slug) {
      fetchData();
      loadCartFromStorage();
    }
  }, [slug]);

  useEffect(() => {
    if (tableParam && tables.length > 0) {
      const matchedTable = tables.find(
        (t) => t.table_number === tableParam || t.table_name === tableParam
      );
      if (matchedTable) {
        setSelectedTable(matchedTable.id);
        const now = new Date();
        setSelectedDate(getLocalDateInput(now));
        setSelectedHour(getLocalTimeInput(now));
      }
    }
  }, [tableParam, tables]);

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
        const menuIds = (menuData || []).map((item) => item.id);
        let recipeData: any[] = [];

        if (menuIds.length > 0) {
          const { data } = await supabase
            .from('menu_item_ingredients')
            .select('menu_item_id, quantity, inventory(name, current_stock)')
            .in('menu_item_id', menuIds);

          recipeData = data || [];
        }

        setMenuItems(applyIngredientAvailability(menuData || [], recipeData));
      }

      // 4. Fetch tables if dine-in enabled - PERBAIKI QUERY INI
      if (settingsData?.enable_table_selection !== false) {
        const { data: tablesData, error: tablesError } = await supabase
          .from('restaurant_tables')
          .select('*')
          .eq('user_id', userId) // Gunakan userId dari restaurant
          // .eq('is_available', true)  // <-- REMOVE THIS LINE
          .order('table_number');

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

      const { data: activeOrdersData, error: activeOrdersError } = await supabase
        .from('orders')
        .select('table_id, status, scheduled_time, created_at')
        .eq('user_id', userId)
        .not('status', 'in', '("completed","cancelled")')
        .not('table_id', 'is', null);

      if (activeOrdersError) {
        console.error('Error fetching active table orders:', activeOrdersError);
      } else {
        setActiveTableOrders(activeOrdersData || []);
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
    if (item.effective_is_available === false) {
      alert(item.sold_out_reason || 'Menu ini sedang habis');
      return;
    }

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

    const unavailableItem = cart.find((item) => item.effective_is_available === false);
    if (unavailableItem) {
      alert(unavailableItem.sold_out_reason || `${unavailableItem.name} sedang habis`);
      return;
    }

    // --- Dine-in specific validations ---
    if (orderType === 'dine_in') {
      if (!selectedTable) {
        alert('Pilih meja untuk order dine-in');
        return;
      }
      if (!customerPhone) {
        alert('Nomor telepon wajib diisi untuk reservasi');
        return;
      }
    }

    if (orderType === 'delivery' && (!customerPhone || !deliveryAddress)) {
      alert('Isi nomor telepon dan alamat untuk delivery');
      return;
    }

    try {
      // Convert scheduled_time to UTC for conflict check and storage
      let scheduledTimeUTC = null;
      if (orderType === 'dine_in') {
        if (selectedTime) {
          scheduledTimeUTC = new Date(selectedTime).toISOString();
        } else {
          // Default to now (e.g., when table param is used)
          scheduledTimeUTC = new Date().toISOString();
        }
      }

      // Conflict check for dine-in
      if (orderType === 'dine_in' && selectedTable && scheduledTimeUTC) {
        const hasConflict = await checkTableConflict(
          restaurant.id,
          selectedTable,
          scheduledTimeUTC
        );
        if (hasConflict) {
          alert('Meja yang dipilih sudah dipesan pada waktu tersebut. Silakan pilih waktu lain atau meja lain.');
          return;
        }
      }

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
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        payment_status: 'pending',
        notes,
        scheduled_time: scheduledTimeUTC, // store UTC timestamp
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

      // Clear cart
      setCart([]);
      saveCartToStorage([]);

      // Show success message
      setOrderNumber(generatedOrderNumber);
      setOrderData(order);
      setOrderSubmitted(true);

      // Send email notification to owner
      if (restaurant?.email) {
        await sendOrderEmail({
          email: restaurant.email,
          orderNumber: generatedOrderNumber,
          customerName: customerName || 'Tanpa nama',
          totalAmount: totalAmount,
          items: cart.map((item) => `${item.name} x${item.quantity}`),
        });
      }

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
        <Navbar mode="public" restaurant={restaurant} settings={settings} showAuthControls={false} />
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
        <Navbar mode="public" restaurant={restaurant} settings={settings} showAuthControls={false} />
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
    );
  }

  // Edit: Switched the public order page background to warm off-white so the content cards stand out more clearly.
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Navbar mode="public" restaurant={restaurant} settings={settings} showAuthControls={false} />

      {/* // Edit: Kept the layout responsive while slightly refining spacing for mobile, tablet, and desktop flow. */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
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

        {/* // Edit: Upgraded the main content area to a balanced responsive grid so the form, menu, and cart feel more intentional on tablet and desktop. */}
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.65fr)_360px]">
          {/* Left Column - Order Form */}
          <div className="space-y-8">
            {/* // Edit: Wrapped the order information area in a softer premium white card with larger radius and subtle border separation. */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 sm:p-7 mb-8">
              {/* // Edit: Added a richer heading block and supporting copy so the order form is easier to understand at a glance. */}
              <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900">Informasi Order</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Lengkapi detail pemesanan terlebih dahulu, lalu lanjut pilih menu favorit Anda.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {orderType === 'dine_in' ? 'Dine In' : orderType === 'takeaway' ? 'Takeaway' : 'Delivery'}
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    {cart.length} item di keranjang
                  </span>
                </div>
              </div>

              {/* Order Type Selection */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Tipe Order
                </label>
                {/* // Edit: Refined the order type buttons into a cleaner responsive grid with larger tablet-friendly touch targets. */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {settings?.enable_table_selection && (
                    <button
                      type="button"
                      onClick={() => setOrderType('dine_in')}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-colors ${orderType === 'dine_in'
                        ? 'border-primary bg-primary/5 text-primary shadow-glow'
                        : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                        }`}
                    >
                      {/* // Edit: Updated the order type selector with softer corners plus warm primary selected and hover states. */}
                      <div className="text-2xl mb-2">🍽️</div>
                      <h3 className="font-semibold text-gray-900">Dine In</h3>
                      <p className="text-sm text-gray-600 mt-1">Makan di tempat</p>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOrderType('takeaway')}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-colors ${orderType === 'takeaway'
                      ? 'border-primary bg-primary/5 text-primary shadow-glow'
                      : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                      }`}
                  >
                    {/* // Edit: Updated the order type selector with softer corners plus warm primary selected and hover states. */}
                    <div className="text-2xl mb-2">🥡</div>
                    <h3 className="font-semibold text-gray-900">Takeaway</h3>
                    <p className="text-sm text-gray-600 mt-1">Ambil di tempat</p>
                  </button>
                  {settings?.enable_delivery && (
                    <button
                      type="button"
                      onClick={() => setOrderType('delivery')}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-colors ${orderType === 'delivery'
                        ? 'border-primary bg-primary/5 text-primary shadow-glow'
                        : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                        }`}
                    >
                      {/* // Edit: Updated the order type selector with softer corners plus warm primary selected and hover states. */}
                      <div className="text-2xl mb-2">🚚</div>
                      <h3 className="font-semibold text-gray-900">Delivery</h3>
                      <p className="text-sm text-gray-600 mt-1">Antar ke alamat</p>
                    </button>
                  )}
                </div>
              </div>

              {/* Order Details */}
              {/* // Edit: Reorganized the form spacing so reservation details and customer fields feel more compact without reducing clarity. */}
              <div className="space-y-6">
                {orderType === 'dine_in' && (
                  <>
                    {/* // Edit: Grouped reservation date and time into a dedicated two-column panel to reduce vertical scrolling before table selection. */}
                    <div className="grid grid-cols-1 gap-4 rounded-[1.5rem] border border-gray-100 bg-[#FFFDFC] p-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tanggal Reservasi
                        </label>
                        {/* // Edit: Softened the date input with larger radius, lighter border, and primary focus styling. */}
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                          min={getLocalDateInput()}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Jam Reservasi
                        </label>
                        {/* // Edit: Softened the time input with larger radius, lighter border, and primary focus styling. */}
                        <input
                          type="time"
                          value={selectedHour}
                          onChange={(e) => setSelectedHour(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                        {tableParam && (
                          <p className="text-sm text-gray-500 mt-1">
                            Tanggal otomatis hari ini, jam bisa disesuaikan.
                          </p>
                        )}
                        {!tableParam && (
                          <p className="text-sm text-gray-500 mt-1">
                            Tanggal otomatis hari ini, tinggal pilih jam lalu cek meja yang kosong.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* // Edit: Turned the table picker into a distinct sub-card so it reads like its own step in the order flow. */}
                    <div className="rounded-[1.75rem] border border-gray-100 bg-[#FFFDFC] p-4 sm:p-5">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pilih Meja
                      </label>
                      <p className="mb-4 text-sm text-gray-500">
                        Pilih meja yang paling sesuai. Meja aktif ditonjolkan, sementara slot terpakai tetap mudah dipindai.
                      </p>
                      {tableOptions.length === 0 ? (
                        <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
                          Tidak ada meja yang tersedia. Harap hubungi restoran.
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                          {/* // Edit: Tightened the table grid so more options stay visible without overwhelming the page. */}
                          {tableOptions.map((table) => {
                            const isSelected = selectedTable === table.id;
                            return (
                              <button
                                key={table.id}
                                type="button"
                                onClick={() => table.is_selectable && setSelectedTable(table.id)}
                                disabled={!table.is_selectable}
                                className={`rounded-[1.5rem] border p-4 text-left transition-all duration-200 ${isSelected
                                  ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
                                  : table.is_selectable
                                    ? 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-primary/50 hover:bg-gray-50 hover:shadow-sm'
                                    : 'border-amber-200 bg-amber-50/70 opacity-90'
                                  } ${!table.is_selectable ? 'cursor-not-allowed' : ''}`}
                              >
                                {/* // Edit: Refined table cards with warm primary selected styling and gentler hover treatment. */}
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-slate-900">
                                      {table.table_name || `Meja ${table.table_number}`}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Kapasitas {table.capacity} orang
                                    </p>
                                  </div>
                                  {/* // Edit: Updated available badges to use softer warm-friendly status colors. */}
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${table.is_selectable
                                    ? 'bg-green-50 text-green-600'
                                    : 'bg-amber-100 text-amber-800'
                                    }`}>
                                    {table.availability_label}
                                  </span>
                                </div>

                                {/* // Edit: Highlighted the chosen booking slot in a softer inset panel for better scanning. */}
                                <div className="mt-3 rounded-2xl bg-white/90 px-3 py-2.5 ring-1 ring-gray-100">
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    Slot Dipilih
                                  </p>
                                  <p className="mt-1 text-sm font-medium text-slate-900">
                                    {table.selected_slot_label}
                                  </p>
                                </div>

                                {/* // Edit: Reduced clutter by showing booking chips in a more compact block while keeping availability context visible. */}
                                <div className="mt-3">
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    Jadwal Terpakai
                                  </p>
                                  {table.today_booking_ranges.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {table.today_booking_ranges.slice(0, 3).map((range: string) => (
                                        <span
                                          key={`${table.id}-${range}`}
                                          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                                        >
                                          {range}
                                        </span>
                                      ))}
                                      {table.today_booking_ranges.length > 3 && (
                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                                          +{table.today_booking_ranges.length - 3} slot
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="mt-1 text-xs text-slate-500">Kosong sepanjang hari.</p>
                                  )}
                                </div>

                                {table.availability_hint && (
                                  <p className="mt-3 text-xs leading-relaxed text-slate-600">{table.availability_hint}</p>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* // Edit: Kept customer details in a responsive two-column layout so the form stays compact on larger screens. */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Anda
                    </label>
                    {/* // Edit: Matched customer inputs to the softened reservation field style for a more cohesive form. */}
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="Nama lengkap"
                      required={orderType !== 'dine_in'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      No. Telepon
                    </label>
                    {/* // Edit: Matched customer inputs to the softened reservation field style for a more cohesive form. */}
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
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
                    {/* // Edit: Softened the delivery textarea styling to match the rest of the premium form controls. */}
                    <textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
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
                  {/* // Edit: Softened the notes textarea styling to keep the final form section visually consistent. */}
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    rows={2}
                    placeholder="Contoh: Tidak pakai pedas, tambah saus, dll."
                  />
                </div>
              </div>
            </div>

            {/* Menu Items */}
            {/* // Edit: Rebuilt the menu area as a dedicated browsing card with clearer hierarchy and more efficient item cards. */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 sm:p-7">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900">Pilih Menu</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Menu dibuat lebih ringkas agar pelanggan bisa membandingkan item dengan cepat.
                  </p>
                </div>
                <div className="inline-flex w-fit rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                  {menuItems.length} menu tersedia
                </div>
              </div>

              {/* // Edit: Tuned the menu grid to show more products per viewport while staying readable on mobile and tablet. */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {menuItems.map(item => (
                  <div
                    key={item.id}
                    className={`flex h-full flex-col rounded-[1.75rem] border p-5 transition-all duration-200 ${item.effective_is_available === false
                      ? 'border-red-200 bg-red-50/40'
                      : 'border-gray-100 bg-[#FFFDFC] hover:-translate-y-0.5 hover:shadow-md'
                      }`}
                  >
                    {/* // Edit: Converted menu items into taller commerce-style cards with softer corners and clearer action placement. */}
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        <p className="mt-1 text-sm leading-6 text-gray-600">{item.description}</p>
                        <p className="mt-3 text-lg font-bold text-primary">
                          Rp {item.price.toLocaleString()}
                        </p>
                        {item.effective_is_available === false && (
                          <p className="text-xs text-red-600 mt-2">
                            {item.sold_out_reason || 'Menu ini sedang habis'}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => addToCart(item)}
                        disabled={item.effective_is_available === false}
                        className={`mt-1 shrink-0 rounded-full p-2.5 ${item.effective_is_available === false
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-primary/10 text-primary hover:bg-primary/20'
                          }`}
                      >
                        {/* // Edit: Enlarged the add button and anchored it visually so product actions are faster to spot. */}
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    </div>
                    {/* // Edit: Moved preparation time and availability into a compact footer row for quicker menu comparison. */}
                    <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                      {item.preparation_time ? (
                        <div className="text-sm text-gray-500">
                          ⏱️ {item.preparation_time} menit
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">Siap dipesan</div>
                      )}
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${item.effective_is_available === false
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-50 text-green-600'
                        }`}>
                        {item.effective_is_available === false ? 'Habis' : 'Tersedia'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Cart Summary */}
          <div>
            {/* // Edit: Wrapped the cart summary in a matching premium white card with larger radius and subtle border definition. */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 sm:p-7 xl:sticky xl:top-24">
              {/* // Edit: Increased the cart heading weight for clearer separation from the body content. */}
              <div className="mb-6 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-extrabold text-gray-900">Keranjang</h2>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} item
                </span>
              </div>

              {cart.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-gray-200 bg-[#FFFDFC] py-10 text-center text-gray-500">
                  <div className="text-4xl mb-4">🛒</div>
                  <p className="font-medium text-gray-700">Keranjang kosong</p>
                  <p className="mt-1 text-sm">Tambahkan item dari menu untuk mulai checkout</p>
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