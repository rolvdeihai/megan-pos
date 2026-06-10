// app/api/dashboard/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseJsonCookie } from '@/lib/cookie-utils';

export async function GET(request: NextRequest) {
  try {
    // Cek cookie owner terlebih dahulu
    const ownerCookie = request.cookies.get('megan_pos_auth');
    let userId: string | null = null;
    let isStaff = false;

    if (ownerCookie) {
      const authData = parseJsonCookie<{ userId?: string }>(ownerCookie.value);
      userId = authData?.userId || null;
    }

    // Jika tidak ada owner cookie, cek staff cookie
    if (!userId) {
      const staffCookie = request.cookies.get('megan_pos_staff');
      if (staffCookie) {
        const authData = parseJsonCookie<{ originalUserId?: string }>(staffCookie.value);
        userId = authData?.originalUserId || null;
        isStaff = true;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ambil query parameters untuk filter tanggal
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Query untuk total revenue (sale) dengan filter tanggal opsional
    let revenueQuery = supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'sale');

    if (startDate) {
      revenueQuery = revenueQuery.gte('created_at', startDate);
    }
    if (endDate) {
      revenueQuery = revenueQuery.lte('created_at', endDate);
    }

    const revenueResult = await revenueQuery;

    // Query untuk total orders dengan filter tanggal opsional
    let ordersQuery = supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (startDate) {
      ordersQuery = ordersQuery.gte('created_at', startDate);
    }
    if (endDate) {
      ordersQuery = ordersQuery.lte('created_at', endDate);
    }

    const ordersResult = await ordersQuery;

    // Active tables (tidak perlu filter tanggal)
    const tablesResult = await supabase
      .from('restaurant_tables')
      .select('id')
      .eq('user_id', userId)
      .eq('is_available', false);

    const totalRevenue = revenueResult.data?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
    const totalOrders = ordersResult.count || 0;
    const activeTables = tablesResult.data?.length || 0;

    // Today's revenue (tetap hari ini, tidak terpengaruh filter)
    const today = new Date().toISOString().split('T')[0];
    const { data: todayRevenueData } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'sale')
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${today}T23:59:59Z`);

    const todayRevenue = todayRevenueData?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;

    return NextResponse.json({
      totalRevenue,
      totalOrders,
      activeTables,
      todayRevenue
    });

  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ 
      totalRevenue: 0,
      totalOrders: 0,
      activeTables: 0,
      todayRevenue: 0
    });
  }
}