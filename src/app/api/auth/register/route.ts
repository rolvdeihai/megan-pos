// src/app/api/auth/register/route.js
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name, phone, restaurant_name } = await request.json();

    // 1. Cek apakah email sudah terdaftar
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar' },
        { status: 400 }
      );
    }

    // 2. Generate restaurant slug dari nama restoran
    const generateSlug = (name: string) => {
      return name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();
    };

    let restaurant_slug = generateSlug(restaurant_name);
    let slugCounter = 1;
    let originalSlug = restaurant_slug;

    // Cek apakah slug sudah digunakan
    while (true) {
      const { data: existingSlug } = await supabase
        .from('users')
        .select('restaurant_slug')
        .eq('restaurant_slug', restaurant_slug)
        .single();

      if (!existingSlug) break;

      restaurant_slug = `${originalSlug}-${slugCounter}`;
      slugCounter++;
    }

    // 3. Hash password
    const passwordHash = await hashPassword(password);

    // 4. Generate user ID
    const userId = crypto.randomUUID();

    // 5. Insert user ke database
    const { error: dbError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        password_hash: passwordHash,
        full_name,
        phone,
        restaurant_name,
        restaurant_slug,
        subscription_tier: 'free',
        is_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (dbError) throw dbError;

    // 6. Create default restaurant settings
    const { error: settingsError } = await supabase
      .from('restaurant_settings')
      .insert({
        user_id: userId,
        tax_percentage: 10,
        service_charge_percentage: 0,
        enable_online_orders: true,
        enable_table_selection: true,
        enable_delivery: true,
        delivery_fee: 0,
        business_hours: {
          monday: { open: "08:00", close: "22:00" },
          tuesday: { open: "08:00", close: "22:00" },
          wednesday: { open: "08:00", close: "22:00" },
          thursday: { open: "08:00", close: "22:00" },
          friday: { open: "08:00", close: "23:00" },
          saturday: { open: "09:00", close: "23:00" },
          sunday: { open: "09:00", close: "22:00" }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (settingsError) throw settingsError;

    // 7. Buat response dengan cookie (auto login)
    const response = NextResponse.json({
      user: {
        id: userId,
        email,
        full_name,
        restaurant_name,
        restaurant_slug,
      }
    });

    const authToken = JSON.stringify({
      userId,
      email,
      timestamp: Date.now()
    });

    response.cookies.set({
      name: 'megan_pos_auth',
      value: authToken,
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;

  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat registrasi' },
      { status: 500 }
    );
  }
}