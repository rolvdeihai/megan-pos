// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { parseJsonCookie } from '@/lib/cookie-utils';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Get cookie using next/headers - tambahkan await
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('megan_pos_auth');
    
    if (!authCookie?.value) {
      return NextResponse.json({ user: null });
    }

    const authData = parseJsonCookie<{ userId?: string }>(authCookie.value);
    const userId = authData?.userId;

    if (!userId) {
      return NextResponse.json({ user: null });
    }

    const { data: userData, error } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, restaurant_name, restaurant_slug')
      .eq('id', userId)
      .single();

    if (error || !userData) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: userData });

  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ user: null });
  }
}
