// src/app/dashboard/orders/new/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import OrderModal from '@/components/orders/OrderModal';
import { useAuth } from '@/components/auth/AuthProvider'; // Tambahkan ini
import { getOwnerId } from '@/lib/user-scope';
import { sendOrderEmail } from '@/lib/email-service';
import { checkTableConflict, type TableOrderStatus } from '@/lib/table-availability';
import { applyIngredientAvailability } from '@/lib/menu-availability';

export default function NewOrderPage() {
  const router = useRouter();
  const [tables, setTables] = useState<any[]>([]);
  const [activeTableOrders, setActiveTableOrders] = useState<TableOrderStatus[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    const { data: activeOrdersData } = await supabase
      .from('orders')
      .select('table_id, status, scheduled_time, created_at')
      .eq('user_id', ownerId)
      .not('status', 'in', '("completed","cancelled")')
      .not('table_id', 'is', null);

    setActiveTableOrders(activeOrdersData || []);

    // Fetch menu items
    const { data: menuData } = await supabase
      .from('menu_items')
      .select('*')
      .eq('user_id', ownerId)
      .eq('is_available', true)
      .order('name');

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

    // Fetch menu categories
    const { data: catData } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('user_id', ownerId)
      .eq('is_active', true)
      .order('display_order');

    setCategories(catData || []);

    // Fetch settings
    const { data: settingsData } = await supabase
      .from('restaurant_settings')
      .select('*')
      .eq('user_id', ownerId)
      .single();

    setSettings(settingsData || { tax_percentage: 10, service_charge_percentage: 0 });
    setLoading(false);
  };

  const handleCreateOrder = async (orderData: any) => {
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
        return;
      }
    }
    // ---------------------------------

    const { items, ...orderFields } = orderData;

    // Generate unique order number with random suffix to prevent collisions
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const subtotal = items.reduce((sum: number, item: any) =>
      sum + (item.price * item.quantity), 0);

    const taxPercentage = settings?.tax_percentage ?? 10;
    const taxAmount = subtotal * (taxPercentage / 100);
    const serviceChargePercentage = settings?.service_charge_percentage ?? 0;
    const serviceChargeAmount = subtotal * (serviceChargePercentage / 100);
    const deliveryFee = orderFields.order_type === 'delivery' ? (settings?.delivery_fee ?? 0) : 0;

    const totalAmount = subtotal + taxAmount + serviceChargeAmount + deliveryFee;

    // Check table conflict if dine-in
    if (orderData.order_type === 'dine_in' && orderData.table_id && orderData.scheduled_time) {
      const hasConflict = await checkTableConflict(
        ownerId,
        orderData.table_id,
        orderData.scheduled_time
      );
      if (hasConflict) {
        alert('Meja yang dipilih sudah dipesan pada waktu tersebut. Silakan pilih waktu lain atau meja lain.');
        setIsSubmitting(false);
        return;
      }
    }

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
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-4 sm:py-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 sm:py-6">
      <div className="mb-6 sm:mb-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Buat Order Baru</h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600">Buat order untuk customer</p>
      </div>

      <OrderModal
        tables={tables}
        activeTableOrders={activeTableOrders}
        menuItems={menuItems}
        categories={categories}
        settings={settings}
        onSubmit={handleCreateOrder}
        onClose={() => router.push('/dashboard/orders')}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
