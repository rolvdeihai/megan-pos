// app/dashboard/public-orders/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BellIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/auth/AuthProvider';

export default function PublicOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      fetchOrders();

      // Real-time subscription
      const channel = supabase
        .channel('public-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
          },
          () => {
            // Re-fetch orders when database changes occur
            fetchOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user?.id) return;

    setLoading(true);
    
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        restaurant_tables(table_number),
        order_items(count)
      `)
      .eq('user_id', user.id)
      .eq('order_type', 'dine_in') // Filter dine-in dari public orders
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error) {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    // Optimistic update or just refetch
    fetchOrders();
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Anda belum login</h2>
          <p className="text-gray-600">Silakan login untuk memantau pesanan.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Order dari Website</h1>
        <p className="mt-2 text-gray-600">Monitor order dari customers melalui website</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pending Orders */}
        <div>
          <div className="flex items-center mb-6">
            <BellIcon className="w-6 h-6 text-yellow-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Menunggu Diproses</h2>
            <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {orders.filter(o => o.status === 'pending').length}
            </span>
          </div>
          <div className="space-y-4">
            {orders
              .filter(o => o.status === 'pending')
              .map(order => (
                <div key={order.id} className="bg-white border-l-4 border-yellow-500 shadow rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold">{order.order_number}</h3>
                      <p className="text-sm text-gray-600">
                        {order.restaurant_tables ? `Meja ${order.restaurant_tables.table_number}` : 'Takeaway'}
                      </p>
                      <p className="text-sm font-medium mt-2">
                        Rp {order.total_amount.toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-lg hover:bg-yellow-200"
                    >
                      Proses
                    </button>
                  </div>
                </div>
              ))}
            {orders.filter(o => o.status === 'pending').length === 0 && (
              <div className="text-center text-sm text-gray-500 py-8 bg-gray-50 rounded-lg">
                Tidak ada order menunggu
              </div>
            )}
          </div>
        </div>

        {/* Preparing Orders */}
        <div>
          <div className="flex items-center mb-6">
            <ClockIcon className="w-6 h-6 text-primary mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Sedang Diproses</h2>
            <span className="ml-2 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {orders.filter(o => o.status === 'preparing').length}
            </span>
          </div>
          <div className="space-y-4">
            {orders
              .filter(o => o.status === 'preparing')
              .map(order => (
                <div key={order.id} className="bg-white border-l-4 border-primary shadow rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold">{order.order_number}</h3>
                      <p className="text-sm text-gray-600">
                        {order.restaurant_tables ? `Meja ${order.restaurant_tables.table_number}` : 'Takeaway'}
                      </p>
                      <p className="text-sm font-medium mt-2">
                        Rp {order.total_amount.toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-lg hover:bg-primary/20"
                    >
                      Selesai
                    </button>
                  </div>
                </div>
              ))}
             {orders.filter(o => o.status === 'preparing').length === 0 && (
              <div className="text-center text-sm text-gray-500 py-8 bg-gray-50 rounded-lg">
                Tidak ada order diproses
              </div>
            )}
          </div>
        </div>

        {/* Completed Orders */}
        <div>
          <div className="flex items-center mb-6">
            <CheckCircleIcon className="w-6 h-6 text-green-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Selesai</h2>
            <span className="ml-2 bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {orders.filter(o => o.status === 'completed').length}
            </span>
          </div>
          <div className="space-y-4">
            {orders
              .filter(o => o.status === 'completed')
              .slice(0, 5)
              .map(order => (
                <div key={order.id} className="bg-white border-l-4 border-green-500 shadow rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold">{order.order_number}</h3>
                      <p className="text-sm text-gray-600">
                        {order.restaurant_tables ? `Meja ${order.restaurant_tables.table_number}` : 'Takeaway'}
                      </p>
                      <p className="text-sm font-medium mt-2">
                        Rp {order.total_amount.toLocaleString()}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-lg">
                      Selesai
                    </span>
                  </div>
                </div>
              ))}
             {orders.filter(o => o.status === 'completed').length === 0 && (
              <div className="text-center text-sm text-gray-500 py-8 bg-gray-50 rounded-lg">
                Belum ada order selesai
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}