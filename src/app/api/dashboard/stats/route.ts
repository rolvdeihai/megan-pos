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

    // Stats sederhana - gunakan userId (owner id) untuk filter
    const [revenueResult, ordersResult, tablesResult] = await Promise.all([
      supabase.from('transactions').select('amount').eq('user_id', userId).eq('type', 'sale'),
      supabase.from('orders').select('id').eq('user_id', userId),
      supabase.from('restaurant_tables').select('id').eq('user_id', userId).eq('is_available', false)
    ]);

    const totalRevenue = revenueResult.data?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
    const totalOrders = ordersResult.data?.length || 0;
    const activeTables = tablesResult.data?.length || 0;

    // Today's revenue
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