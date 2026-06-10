// app/api/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseJsonCookie } from '@/lib/cookie-utils';

export async function GET(request: NextRequest) {
  try {
    // Autentikasi (sama seperti dashboard stats)
    const ownerCookie = request.cookies.get('megan_pos_auth');
    let userId: string | null = null;

    if (ownerCookie) {
      const authData = parseJsonCookie<{ userId?: string }>(ownerCookie.value);
      userId = authData?.userId || null;
    }
    if (!userId) {
      const staffCookie = request.cookies.get('megan_pos_staff');
      if (staffCookie) {
        const authData = parseJsonCookie<{ originalUserId?: string }>(staffCookie.value);
        userId = authData?.originalUserId || null;
      }
    }
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query parameters
    const searchParams = request.nextUrl.searchParams;
    let startDate = searchParams.get('start_date');
    let endDate = searchParams.get('end_date');
    const groupBy = searchParams.get('group_by') || 'day'; // day, week, month

    // Set default start_date (30 hari lalu) jika tidak ada
    if (!startDate) {
      const defaultStart = new Date();
      defaultStart.setDate(defaultStart.getDate() - 29);
      defaultStart.setHours(0, 0, 0, 0);
      startDate = defaultStart.toISOString();
    }
    if (!endDate) {
      const defaultEnd = new Date();
      defaultEnd.setHours(23, 59, 59, 999);
      endDate = defaultEnd.toISOString();
    }

    // 1. Daily sales (line chart data)
    const { data: salesData } = await supabase
      .from('transactions')
      .select('amount, created_at, type')
      .eq('user_id', userId)
      .eq('type', 'sale')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    // 2. Payment method distribution (pie chart)
    const { data: paymentData } = await supabase
      .from('transactions')
      .select('payment_method, amount')
      .eq('user_id', userId)
      .eq('type', 'sale')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    // 3. Top menu items (bar chart) - berdasarkan order_items
    const { data: topMenuData } = await supabase
      .from('order_items')
      .select('menu_items(name), quantity')
      .eq('orders.user_id', userId)
      .gte('orders.created_at', startDate)
      .lte('orders.created_at', endDate)
      .is('orders.deleted_at', null);

    // Alternatif jika relasi tidak bekerja: gunakan raw query atau join manual
    // Kita akan lakukan pendekatan manual agar lebih robust
    const { data: ordersInRange } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    
    const orderIds = ordersInRange?.map(o => o.id) || [];
    let topItems: { name: string; quantity: number }[] = [];
    if (orderIds.length > 0) {
      const { data: items } = await supabase
        .from('order_items')
        .select('menu_items(name), quantity')
        .in('order_id', orderIds);
      
      if (items) {
        const itemMap = new Map<string, number>();
        items.forEach((item: any) => {
          const name = item.menu_items?.name || 'Unknown';
          itemMap.set(name, (itemMap.get(name) || 0) + item.quantity);
        });
        topItems = Array.from(itemMap.entries())
          .map(([name, quantity]) => ({ name, quantity }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10);
      }
    }

    // 4. Total expenses (pengeluaran) dalam periode
    const { data: expensesData } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    const totalExpenses = expensesData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

    // 5. Total income (sales)
    const totalIncome = salesData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

    // 6. Profit
    const profit = totalIncome - totalExpenses;

    // 7. Group sales by day/week/month untuk line chart
    const groupedSales: { date: string; total: number }[] = [];
    if (salesData) {
      const groupingMap = new Map<string, number>();
      salesData.forEach(sale => {
        let key: string;
        const date = new Date(sale.created_at);
        if (groupBy === 'day') {
          key = date.toISOString().split('T')[0];
        } else if (groupBy === 'week') {
          const weekNumber = getWeekNumber(date);
          key = `${date.getFullYear()}-W${weekNumber}`;
        } else {
          key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        }
        groupingMap.set(key, (groupingMap.get(key) || 0) + sale.amount);
      });
      for (const [date, total] of groupingMap.entries()) {
        groupedSales.push({ date, total });
      }
      groupedSales.sort((a, b) => a.date.localeCompare(b.date));
    }

    // 8. Payment method summary
    const paymentSummary: { name: string; value: number }[] = [];
    if (paymentData) {
      const paymentMap = new Map<string, number>();
      paymentData.forEach(p => {
        paymentMap.set(p.payment_method, (paymentMap.get(p.payment_method) || 0) + p.amount);
      });
      for (const [method, amount] of paymentMap.entries()) {
        paymentSummary.push({ name: method, value: amount });
      }
    }

    // 9. Order count trend
    const { data: ordersCountData } = await supabase
      .from('orders')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    const orderCountByDate = new Map<string, number>();
    ordersCountData?.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      orderCountByDate.set(date, (orderCountByDate.get(date) || 0) + 1);
    });
    const orderTrend = Array.from(orderCountByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      dailySales: groupedSales,
      paymentMethods: paymentSummary,
      topItems: topItems,
      totalIncome,
      totalExpenses,
      profit,
      orderTrend,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

function getWeekNumber(d: Date): number {
  const temp = new Date(d.valueOf());
  temp.setHours(0, 0, 0, 0);
  temp.setDate(temp.getDate() + 3 - ((temp.getDay() + 6) % 7));
  const week1 = new Date(temp.getFullYear(), 0, 4);
  return 1 + Math.round(((temp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}