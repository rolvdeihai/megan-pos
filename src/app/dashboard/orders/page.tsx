// src/app/dashboard/orders/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import OrderModal from '@/components/orders/OrderModal';
import InvoiceModal from '@/components/orders/InvoiceModal';
import { useAuth } from '@/components/auth/AuthProvider';
import { getOwnerId } from '@/lib/user-scope';
import { filterOrdersByTab, summarizeOrderTabs } from '@/lib/orders-dashboard-utils';
import { sendOrderEmail } from '@/lib/email-service';
import { checkTableConflict } from '@/lib/table-availability';
import { applyIngredientAvailability } from '@/lib/menu-availability';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';

type Order = {
  id: string;
  order_number: string;
  table_id: string;
  table_number?: string;
  order_type: string;
  customer_name: string;
  status: string;
  total_amount: number;
  payment_status: string;
  created_at: string;
  items_count?: number;
  scheduled_time?: string | null; // add this line
};

// Customize stagger timing here.
const orderGridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.08 },
  },
};

// Customize card entrance animation here.
const orderCardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2, ease: 'easeInOut' as const },
  },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSummary, setOrderSummary] = useState({ active: 0, completed: 0 });

  // Gunakan useAuth yang sudah ada
  const { user, isLoading: authLoading } = useAuth();
  const ownerId = getOwnerId(user);
  const router = useRouter();

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!ownerId) return;

    setLoading(true);

    try {
      // Fetch orders
      let query = supabase
        .from('orders')
        .select(`
          *,
          restaurant_tables(table_number),
          order_items(id, quantity)
        `)
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false });

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        setOrders([]);
        setOrderSummary({ active: 0, completed: 0 });
      } else {
        // Format orders dengan benar
        const formattedOrders = (ordersData || []).map(order => ({
          ...order,
          table_number: order.restaurant_tables?.table_number || null,
          items_count: order.order_items?.reduce((sum: number, item: any) =>
            sum + (item.quantity || 0), 0) || 0
        }));

        setOrders(formattedOrders);
        setOrderSummary(summarizeOrderTabs(formattedOrders));
      }

      // Fetch tables
      const { data: tablesData, error: tablesError } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('user_id', ownerId)
        .order('table_number');

      if (tablesError) {
        console.error('Error fetching tables:', tablesError);
      } else {
        setTables(tablesData || []);
      }

      // Fetch menu items
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('user_id', ownerId)
        .eq('is_available', true)
        .order('name');

      if (menuError) {
        console.error('Error fetching menu items:', menuError);
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

      // Fetch menu categories
      const { data: catData, error: catError } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('user_id', ownerId)
        .eq('is_active', true)
        .order('display_order');

      if (catError) {
        console.error('Error fetching menu categories:', catError);
      } else {
        setCategories(catData || []);
      }

      // Fetch settings
      const { data: settingsData } = await supabase
        .from('restaurant_settings')
        .select('*')
        .eq('user_id', ownerId)
        .single();

      setSettings(settingsData || { tax_percentage: 10, service_charge_percentage: 0 });
    } catch (error) {
      console.error('Error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (orderData: any) => {
    if (!ownerId || !user) return;

    // Prevent duplicate submission
    if (isSubmitting) return;
    setIsSubmitting(true);

    // --- ENFORCE TRANSACTION LIMIT ---
    let tier = user.subscription_tier || 'basic';
    if (tier === 'free') tier = 'basic';
    if (tier === 'basic') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count, error: countError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ownerId)
        .gte('created_at', startOfMonth.toISOString());

      if (!countError && count !== null && count >= 100) {
        if (confirm('Batas maksimum 100 transaksi/bulan untuk paket Basic telah tercapai. Apakah Anda ingin meng-upgrade paket?')) {
          router.push('/dashboard/billing');
        }
        setIsSubmitting(false);
        return;
      }
    }
    // ---------------------------------

    // Extract items and the rest of the order fields from the parameter
    const { items, ...orderFields } = orderData;

    // Check table conflict for dine‑in
    if (orderFields.order_type === 'dine_in' && orderFields.table_id && orderFields.scheduled_time) {
      // Convert local datetime (YYYY-MM-DDTHH:mm) to UTC ISO string
      const scheduledTimeUTC = new Date(orderFields.scheduled_time).toISOString();
      const hasConflict = await checkTableConflict(
        ownerId,
        orderFields.table_id,
        scheduledTimeUTC
      );
      if (hasConflict) {
        alert('Meja yang dipilih sudah dipesan pada waktu tersebut. Silakan pilih waktu lain atau meja lain.');
        setIsSubmitting(false);
        return;
      }
    }

    // Generate unique order number
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    // Calculate financials
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

    // Fetch tax, service charge, and delivery fee from restaurant settings
    const { data: settingsData } = await supabase
      .from('restaurant_settings')
      .select('tax_percentage, service_charge_percentage, delivery_fee')
      .eq('user_id', ownerId)
      .single();

    const taxPercentage = settingsData?.tax_percentage ?? 10;
    const serviceChargePercentage = settingsData?.service_charge_percentage ?? 0;
    const deliveryFee = orderFields.order_type === 'delivery' ? (settingsData?.delivery_fee ?? 0) : 0;

    const taxAmount = subtotal * (taxPercentage / 100);
    const serviceChargeAmount = subtotal * (serviceChargePercentage / 100);
    const totalAmount = subtotal + taxAmount + serviceChargeAmount + deliveryFee;

    // Insert the order
    const { data: newOrder, error } = await supabase
      .from('orders')
      .insert({
        ...orderFields,               // contains table_id, customer_name, scheduled_time, etc.
        order_number: orderNumber,
        user_id: ownerId,
        status: 'pending',
        subtotal: subtotal,
        tax_percentage: taxPercentage,
        tax_amount: taxAmount,
        service_charge_percentage: serviceChargePercentage,
        service_charge_amount: serviceChargeAmount,
        delivery_fee: deliveryFee,
        discount_percentage: 0,
        discount_amount: 0,
        total_amount: totalAmount,
        payment_status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating order:', error);
      alert('Gagal membuat order: ' + (error?.message || 'Unknown error'));
      setIsSubmitting(false);
      return;
    }

    // Insert order items
    const orderItems = items.map((item: any) => ({
      order_id: newOrder.id,
      menu_item_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
      special_instructions: item.special_instructions,
    }));

    await supabase.from('order_items').insert(orderItems);

    // Send email notification to owner
    if (user?.email) {
      await sendOrderEmail({
        email: user.email,
        orderNumber: orderNumber,
        customerName: orderFields.customer_name || 'Tanpa nama',
        totalAmount: totalAmount,
        items: items.map((item: any) => `${item.name} x${item.quantity}`),
      });
    }

    // Refresh data and close modal
    await fetchData();
    setShowOrderModal(false);
    setIsSubmitting(false);
  };

  const completeOrder = async (orderId: string) => {
    // Refresh data first (optional: await if you want to ensure fresh data before alert)
    await fetchData();

    // Show popup message
    alert('✅ Transaksi selesai');

    // Close the invoice modal after user acknowledges the popup
    setShowInvoiceModal(false);
  };

  const deleteOrder = async (orderId: string, orderNumber: string) => {
    if (!confirm(`Yakin ingin membatalkan dan menghapus order ${orderNumber}?`)) {
      return;
    }

    try {
      // First delete related order_items (foreign key constraint)
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      // Delete related transactions so stale Pengeluaran from inventory doesn't remain.
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('order_id', orderId)
        .eq('user_id', ownerId);

      if (transactionsError) throw transactionsError;

      // Then delete the order itself
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Refresh data
      await fetchData();
      alert(`Order ${orderNumber} berhasil dibatalkan.`);
    } catch (error: any) {
      console.error('Error deleting order:', error);
      alert('Gagal menghapus order: ' + error.message);
    }
  };

  // Tampilkan loading jika auth masih loading
  if (authLoading || loading) {
    return (
      <div className="py-4 sm:py-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data order...</p>
        </div>
      </div>
    );
  }

  const displayedOrders = filterOrdersByTab(orders, activeTab);
  // Update "new order" time window here (minutes).
  const NEW_ORDER_MINUTES = 12;

  // Tampilkan pesan jika tidak ada user (belum login)
  if (!user) {
    return (
      <div className="py-4 sm:py-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Anda belum login</h2>
          <p className="text-gray-600">Silakan login untuk melihat data order.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 sm:py-6">
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Manajemen Order</h1>
            <p className="mt-1 text-sm text-slate-500">Kelola order aktif dan riwayat transaksi dalam satu tempat.</p>
          </div>
          <button
            onClick={() => setShowOrderModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium"
          >
            + Order Baru
          </button>
        </div>

        <div className="mt-5">
          <nav className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('pending')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'pending'
                ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              <span>Order Aktif</span>
              <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-slate-700">{orderSummary.active}</span>
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'completed'
                ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              <span>Riwayat Order</span>
              <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-slate-700">{orderSummary.completed}</span>
            </button>
          </nav>
        </div>
      </div>

      {displayedOrders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum ada order</h3>
          <p className="text-gray-600 mb-6">
            {activeTab === 'pending'
              ? 'Tidak ada order yang sedang aktif'
              : 'Belum ada riwayat order yang selesai'}
          </p>
          <button
            onClick={() => setShowOrderModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            + Buat Order Pertama
          </button>
        </div>
      ) : (
        <LayoutGroup>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5"
            variants={orderGridVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence mode="popLayout">
              {displayedOrders.map((order) => {
                const isNewOrder = order.status === 'pending'
                  && (Date.now() - new Date(order.created_at).getTime()) < NEW_ORDER_MINUTES * 60 * 1000;

                return (
            <motion.div
              key={order.id}
              layout
              variants={orderCardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ layout: { duration: 0.32, ease: 'easeInOut' } }}
              className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-blue-500/70 to-indigo-500/80" />
              {/* Tune glow style for new orders here. */}
              {isNewOrder && (
                <>
                  <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-amber-300/70 animate-pulse" />
                  <span className="absolute top-3 right-3 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                    Baru
                  </span>
                </>
              )}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900">{order.order_number}</h3>
                  <p className="text-sm text-slate-600">
                    {order.table_number ? `Meja ${order.table_number}` :
                      order.order_type === 'takeaway' ? 'Takeaway' : 'Delivery'}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 text-xs font-semibold rounded-full ${order.status === 'pending'
                    ? 'bg-amber-100 text-amber-800'
                    : order.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-700'
                    }`}
                >
                  {order.status === 'pending' ? 'Pending' : order.status === 'completed' ? 'Selesai' : order.status}
                </span>
              </div>

              <div className="mb-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {order.order_type === 'dine_in' ? 'Dine In' : order.order_type === 'takeaway' ? 'Takeaway' : 'Delivery'}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {order.items_count || 0} items
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  Customer: <span className="font-medium text-slate-800">{order.customer_name || 'Tanpa nama'}</span>
                </p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  Total: Rp {order.total_amount.toLocaleString()}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  Tanggal: {new Date(order.created_at).toLocaleDateString('id-ID')}
                </p>
                {order.order_type === 'dine_in' && order.scheduled_time && (
                  <p className="text-sm text-slate-600 mt-1">
                    Waktu reservasi: {new Date(order.scheduled_time).toLocaleString('id-ID')}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedOrder(order);
                    setShowInvoiceModal(true);
                  }}
                  className="flex-1 px-3 py-2.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 font-medium"
                >
                  Lihat Detail
                </button>
                {order.status !== 'completed' && (
                  <button
                    onClick={() => deleteOrder(order.id, order.order_number)}
                    className="px-3 py-2.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                    title="Batalkan dan hapus order"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
                )}
              </div>
            </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      )}

      <AnimatePresence>
        {showOrderModal && (
          <OrderModal
            tables={tables}
            activeTableOrders={orders.map((order) => ({
              table_id: order.table_id,
              status: order.status,
              scheduled_time: order.scheduled_time,
              created_at: order.created_at,
            }))}
            menuItems={menuItems}
            categories={categories}
            settings={settings}
            onSubmit={createOrder}
            onClose={() => setShowOrderModal(false)}
            isSubmitting={isSubmitting}
          />
        )}
      </AnimatePresence>

      {showInvoiceModal && selectedOrder && (
        <InvoiceModal
          order={selectedOrder}
          onComplete={() => completeOrder(selectedOrder.id)}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}
    </div>
  );
}
