// src/app/dashboard/orders/new/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import OrderModal from '@/components/orders/OrderModal';
import { useAuth } from '@/components/auth/AuthProvider'; // Tambahkan ini
import { getOwnerId } from '@/lib/user-scope';
import { sendOrderEmail } from '@/lib/email-service';

export default function NewOrderPage() {
  const router = useRouter();
  const [tables, setTables] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
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
      .eq('is_available', true)
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

    // Fetch menu categories
    const { data: catData } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('user_id', ownerId)
      .eq('is_active', true)
      .order('display_order');

    setCategories(catData || []);
    setLoading(false);
  };

  const handleCreateOrder = async (orderData: any) => {
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
        ...orderFields,
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

      router.push('/dashboard/orders');
    } else {
      console.error('Error creating order:', error);
      alert('Gagal membuat order: ' + (error?.message || 'Unknown error'));
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
        categories={categories}
        onSubmit={handleCreateOrder}
        onClose={() => router.push('/dashboard/orders')}
      />
    </div>
  );
}
