// src/app/dashboard/orders/new/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import OrderModal from '@/components/orders/OrderModal';
import { useAuth } from '@/components/auth/AuthProvider'; // Tambahkan ini
import { getOwnerId } from '@/lib/user-scope';

export default function NewOrderPage() {
  const router = useRouter();
  const [tables, setTables] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Gunakan useAuth yang sudah ada
  const { user } = useAuth();
  const ownerId = getOwnerId(user);

  useEffect(() => {
    if (ownerId) {
      fetchData();
    }
  }, [ownerId]);

  const fetchData = async () => {
    if (!ownerId) return;
    
    // Fetch tables
    const { data: tablesData } = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('user_id', ownerId)
      .order('table_number');

    setTables(tablesData || []);

    // Fetch menu items
    const { data: menuData } = await supabase
      .from('menu_items')
      .select('*')
      .eq('user_id', ownerId)
      .eq('is_available', true)
      .order('name');

    setMenuItems(menuData || []);
    setLoading(false);
  };

  const handleCreateOrder = async (orderData: any) => {
    if (!ownerId) return;
    
    // Generate order number
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
    
    const subtotal = orderData.items.reduce((sum: number, item: any) => 
      sum + (item.price * item.quantity), 0);
    
    const taxPercentage = 10; // Default tax
    const taxAmount = subtotal * (taxPercentage / 100);
    const totalAmount = subtotal + taxAmount;
    
    const { data, error } = await supabase
      .from('orders')
      .insert({
        ...orderData,
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
      // Insert order items
      const orderItems = orderData.items.map((item: any) => ({
        order_id: data.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        special_instructions: item.special_instructions,
      }));

      await supabase.from('order_items').insert(orderItems);

      // Update table availability if dine-in
      if (orderData.order_type === 'dine_in' && orderData.table_id) {
        await supabase
          .from('restaurant_tables')
          .update({ is_available: false })
          .eq('id', orderData.table_id);
      }

      router.push('/dashboard/orders');
    } else {
      console.error('Error creating order:', error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Buat Order Baru</h1>
        <p className="mt-2 text-gray-600">Buat order untuk customer</p>
      </div>

      <OrderModal
        tables={tables}
        menuItems={menuItems}
        onSubmit={handleCreateOrder}
        onClose={() => router.push('/dashboard/orders')}
      />
    </div>
  );
}