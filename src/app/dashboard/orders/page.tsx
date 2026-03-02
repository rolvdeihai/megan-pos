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
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [loading, setLoading] = useState(true);
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
        .eq('is_available', true)
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
        setMenuItems(menuData || []);
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
    } catch (error) {
      console.error('Error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (orderData: any) => {
    if (!ownerId || !user) return;

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
        return;
      }
    }
    // ---------------------------------

    // FIX: Pisahkan 'items' dari data order utama, karena 'items' tidak ada di tabel 'orders'
    const { items, ...orderFields } = orderData;

    // Generate order number
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    const subtotal = items.reduce((sum: number, item: any) =>
      sum + (item.price * item.quantity), 0);

    const taxPercentage = 10; // Default tax
    const taxAmount = subtotal * (taxPercentage / 100);
    const totalAmount = subtotal + taxAmount;

    const { data, error } = await supabase
      .from('orders')
      .insert({
        ...orderFields, // Masukkan field lain (table_id, customer_name, dll) kecuali items
        order_number: orderNumber,
        user_id: ownerId,
        status: 'pending',
        subtotal: subtotal,
        tax_percentage: taxPercentage,
        tax_amount: taxAmount,
        discount_percentage: 0,
        discount_amount: 0,
        total_amount: totalAmount,
        payment_status: 'pending'
      })
      .select()
      .single();

    if (!error && data) {
      // Insert order items ke tabel terpisah
      const orderItems = items.map((item: any) => ({
        order_id: data.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        special_instructions: item.special_instructions,
      }));

      await supabase.from('order_items').insert(orderItems);

      // Update table availability if dine-in
      if (orderFields.order_type === 'dine_in' && orderFields.table_id) {
        await supabase
          .from('restaurant_tables')
          .update({ is_available: false })
          .eq('id', orderFields.table_id);
      }

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

      fetchData();
      setShowOrderModal(false);
    } else {
      console.error('Error creating order:', error);
      alert('Gagal membuat order: ' + (error?.message || 'Unknown error'));
    }
  };

  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  const completeOrder = async (orderId: string) => {
    if (processingOrderId) return; // Prevent double click
    
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    setProcessingOrderId(orderId);

    try {
      const response = await fetch('/api/orders/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          paymentMethod: 'cash',
          userId: ownerId,
        }),
      });

      const data = await response.json();

      // Create transaction record
      const { error: transactionError } = await supabase.from('transactions').insert({
        user_id: user?.id,
        order_id: orderId,
        transaction_number: `TRX-${Date.now().toString().slice(-6)}`,
        type: 'sale',
        amount: order.total_amount,
        payment_method: 'cash', // Default fallback if paid via shortcut
        status: 'completed',
        notes: `Pembayaran langsung dari dashboard untuk order ${order.order_number}`,
      });

      if (transactionError) throw transactionError;

      // Deduct inventory (Sistem Gramasi)
      const { data: orderWithItems } = await supabase
        .from('orders')
        .select(`
          order_items(
            menu_item_id,
            quantity
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderWithItems && orderWithItems.order_items) {
        for (const item of orderWithItems.order_items) {
          const { data: recipes } = await supabase
            .from('menu_item_ingredients')
            .select('*')
            .eq('menu_item_id', item.menu_item_id);

          if (recipes && recipes.length > 0) {
            for (const recipe of recipes) {
              const totalDeduction = recipe.quantity * (+item.quantity || 1);

              const { data: invItem } = await supabase
                .from('inventory')
                .select('current_stock')
                .eq('id', recipe.inventory_id)
                .single();

              if (invItem) {
                const newStock = Math.max(0, invItem.current_stock - totalDeduction);
                await supabase
                  .from('inventory')
                  .update({ current_stock: newStock })
                  .eq('id', recipe.inventory_id);
              }
            }
          }
        }
      }

      // Free the table if dine-in
      if (order.table_id) {
        await supabase
          .from('restaurant_tables')
          .update({ is_available: true })
          .eq('id', order.table_id);
      }

      // If duplicate, just proceed without error
      if (data.duplicate) {
        fetchData();
        setShowInvoiceModal(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menyelesaikan order');
      }

      fetchData();
      setShowInvoiceModal(false);
    } catch (error: any) {
      console.error('Error completing order:', error);
      alert(error.message || 'Gagal menyelesaikan order');
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Tampilkan loading jika auth masih loading
  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data order...</p>
        </div>
      </div>
    );
  }

  const displayedOrders = filterOrdersByTab(orders, activeTab);

  // Tampilkan pesan jika tidak ada user (belum login)
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Anda belum login</h2>
          <p className="text-gray-600">Silakan login untuk melihat data order.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Order</h1>
        <button
          onClick={() => setShowOrderModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          + Order Baru
        </button>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-2 px-4 font-medium text-sm ${activeTab === 'pending'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Order Aktif ({orderSummary.active})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`py-2 px-4 font-medium text-sm ${activeTab === 'completed'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Riwayat Order ({orderSummary.completed})
          </button>
        </nav>
      </div>

      {displayedOrders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum ada order</h3>
          <p className="text-gray-600 mb-6">
            {activeTab === 'pending'
              ? 'Tidak ada order yang sedang aktif'
              : 'Belum ada riwayat order yang selesai'}
          </p>
          <button
            onClick={() => setShowOrderModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            + Buat Order Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">{order.order_number}</h3>
                  <p className="text-sm text-gray-600">
                    {order.table_number ? `Meja ${order.table_number}` :
                      order.order_type === 'takeaway' ? 'Takeaway' : 'Delivery'}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${order.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : order.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                    }`}
                >
                  {order.status}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Customer: {order.customer_name || 'Tanpa nama'}
                </p>
                <p className="text-sm text-gray-600">
                  Items: {order.items_count}
                </p>
                <p className="text-sm text-gray-600">
                  Total: Rp {order.total_amount.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Tanggal: {new Date(order.created_at).toLocaleDateString('id-ID')}
                </p>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setSelectedOrder(order);
                    setShowInvoiceModal(true);
                  }}
                  className="flex-1 px-3 py-2 bg-primary text-white text-sm rounded hover:bg-primary/90"
                >
                  Lihat Detail
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showOrderModal && (
        <OrderModal
          tables={tables}
          menuItems={menuItems}
          categories={categories}
          onSubmit={createOrder}
          onClose={() => setShowOrderModal(false)}
        />
      )}

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
