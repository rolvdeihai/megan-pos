import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getEmployeePermissionsForAuth } from '@/lib/rbac-server';

export async function POST(request: NextRequest) {
  try {
    const { slug, pin } = await request.json();

    // 1. Cari user berdasarkan restaurant_slug
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, restaurant_slug, full_name, restaurant_name')
      .ilike('restaurant_slug', String(slug || '').trim().toLowerCase())
      .maybeSingle();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Restaurant tidak ditemukan' },
        { status: 404 }
      );
    }

    // 2. Cari employee berdasarkan user_id dan PIN
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('id, full_name, role, role_id, email, user_id, roles(name)')
      .eq('user_id', userData.id)
      .eq('pin_code', pin)
      .eq('is_active', true)
      .single();

    if (employeeError || !employeeData) {
      return NextResponse.json(
        { error: 'PIN salah atau karyawan tidak aktif' },
        { status: 401 }
      );
    }

    // 3. Buat response dengan cookie
    const permissions = await getEmployeePermissionsForAuth({
      role_id: employeeData.role_id ?? null,
      role: employeeData.role ?? null,
    });
    const roleName =
      (employeeData as { roles?: { name?: string | null } | null }).roles?.name ?? null;

    const response = NextResponse.json({
      success: true,
      user: {
        id: employeeData.id,
        full_name: employeeData.full_name,
        role: employeeData.role,
        role_id: employeeData.role_id,
        role_name: roleName,
        user_id: employeeData.user_id,
        restaurant_slug: userData.restaurant_slug,
        restaurant_name: userData.restaurant_name,
        email: employeeData.email || '',
        is_staff: true,
        original_user_id: userData.id,
        permissions,
      }
    });

    // 4. Set cookie untuk staff
    const authToken = JSON.stringify({
      userId: employeeData.id,
      userType: 'staff',
      originalUserId: userData.id,
      restaurantSlug: userData.restaurant_slug,
      role: employeeData.role,
      roleId: employeeData.role_id,
      roleName,
      permissions,
      timestamp: Date.now()
    });

    response.cookies.set({
      name: 'megan_pos_staff',
      value: authToken,
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;

  } catch (error: any) {
    console.error('Staff login error:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat login' },
      { status: 500 }
    );
  }
}