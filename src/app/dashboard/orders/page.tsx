'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import OrderModal from '@/components/orders/OrderModal';
import InvoiceModal from '@/components/orders/InvoiceModal';
import { useAuth } from '@/components/auth/AuthProvider';
import { getOwnerId } from '@/lib/user-scope';

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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [loading, setLoading] = useState(true);

  // Gunakan useAuth yang sudah ada
  const { user, isLoading: authLoading } = useAuth();
  const ownerId = getOwnerId(user);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [activeTab, user]);

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

      if (activeTab === 'pending') {
        query = query.neq('status', 'completed');
      } else {
        query = query.eq('status', 'completed');
      }

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        setOrders([]);
      } else {
        // Format orders dengan benar
        const formattedOrders = (ordersData || []).map(order => ({
          ...order,
          table_number: order.restaurant_tables?.table_number || null,
          items_count: order.order_items?.reduce((sum: number, item: any) => 
            sum + (item.quantity || 0), 0) || 0
        }));
        
        setOrders(formattedOrders);
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
    } catch (error) {
      console.error('Error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (orderData: any) => {
    if (!ownerId) return;
    
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

      fetchData();
      setShowOrderModal(false);
    } else {
      console.error('Error creating order:', error);
      alert('Gagal membuat order: ' + (error?.message || 'Unknown error'));
    }
  };

  const completeOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    try {
      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          payment_status: 'paid',
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Free the table if dine-in
      if (order.table_id) {
        await supabase
          .from('restaurant_tables')
          .update({ is_available: true })
          .eq('id', order.table_id);
      }

      fetchData();
      setShowInvoiceModal(false);
    } catch (error) {
      console.error('Error completing order:', error);
      alert('Gagal menyelesaikan order');
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
            className={`py-2 px-4 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Order Aktif ({orders.filter(o => o.status !== 'completed').length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`py-2 px-4 font-medium text-sm ${
              activeTab === 'completed'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Riwayat Order ({orders.filter(o => o.status === 'completed').length})
          </button>
        </nav>
      </div>

      {orders.length === 0 ? (
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
          {orders.map((order) => (
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
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    order.status === 'pending'
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
                {order.status !== 'completed' && (
                  <button
                    onClick={() => completeOrder(order.id)}
                    className="flex-1 px-3 py-2 bg-primary text-white text-sm rounded hover:bg-primary/90"
                  >
                    Selesaikan
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showOrderModal && (
        <OrderModal
          tables={tables}
          menuItems={menuItems}
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