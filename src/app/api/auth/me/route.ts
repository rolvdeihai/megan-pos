// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Get cookie using next/headers - tambahkan await
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('megan_pos_auth');
    
    if (!authCookie?.value) {
      return NextResponse.json({ user: null });
    }

    const authData = JSON.parse(authCookie.value);
    const userId = authData.userId;

    const { data: userData, error } = await supabase
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