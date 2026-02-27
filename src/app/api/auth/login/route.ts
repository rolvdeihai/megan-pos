// src/app/api/auth/login/route.js

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyPassword } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // 1. Cek apakah user ada di database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // 2. Verifikasi password
    const isValidPassword = await verifyPassword(password, userData.password_hash);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // 3. Buat response dengan cookie
    const response = NextResponse.json({
      user: {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        restaurant_name: userData.restaurant_name,
        restaurant_slug: userData.restaurant_slug,
      }
    });

    // 4. Set cookie untuk server-side auth
    const authToken = JSON.stringify({
      userId: userData.id,
      email: userData.email,
      timestamp: Date.now()
    });

    response.cookies.set({
      name: 'megan_pos_auth',
      value: authToken,
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat login' },
      { status: 500 }
    );
  }
}