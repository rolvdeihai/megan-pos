import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getEmployeePermissionsForAuth } from '@/lib/rbac-server';
import { parseJsonCookie } from '@/lib/cookie-utils';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    // Cek owner cookie terlebih dahulu
    const ownerCookie = cookieStore.get('megan_pos_auth');

    if (ownerCookie?.value) {
      const authData = parseJsonCookie<{ userId?: string }>(ownerCookie.value);
      const userId = authData?.userId;

      if (!userId) {
        return NextResponse.json({ user: null });
      }

      const { data: userData, error } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, restaurant_name, restaurant_slug, subscription_tier')
        .eq('id', userId)
        .single();

      if (error || !userData) {
        return NextResponse.json({ user: null });
      }

      return NextResponse.json({
        user: {
          ...userData,
          is_staff: false,
          user_type: 'owner',
          permissions: ['*'],
        }
      });
    }

    // Cek staff cookie
    const staffCookie = cookieStore.get('megan_pos_staff');
    if (staffCookie?.value) {
      const authData = parseJsonCookie<{ userId?: string; originalUserId?: string }>(staffCookie.value);
      const userId = authData?.userId; // Ini adalah employee.id
      const originalUserId = authData?.originalUserId; // Ini adalah user.id (owner)

      if (!userId || !originalUserId) {
        return NextResponse.json({ user: null });
      }

      // Ambil data employee
      const { data: employeeData, error } = await supabaseAdmin
        .from('employees')
        .select('id, full_name, role, role_id, email, user_id, roles(name)')
        .eq('id', userId)
        .single();

      if (error || !employeeData) {
        return NextResponse.json({ user: null });
      }

      // Ambil data restaurant dan subscription dari owner
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('restaurant_slug, restaurant_name, subscription_tier')
        .eq('id', originalUserId)
        .single();

      const permissions = await getEmployeePermissionsForAuth({
        role_id: employeeData.role_id ?? null,
        role: employeeData.role ?? null,
      });
      const roleName =
        (employeeData as { roles?: { name?: string | null } | null }).roles?.name ?? null;

      return NextResponse.json({
        user: {
          id: employeeData.id,
          email: employeeData.email || '',
          full_name: employeeData.full_name,
          role: employeeData.role,
          role_id: employeeData.role_id,
          role_name: roleName,
          restaurant_slug: userData?.restaurant_slug || '',
          restaurant_name: userData?.restaurant_name || '',
          subscription_tier: userData?.subscription_tier || 'basic',
          user_id: employeeData.user_id,
          is_staff: true,
          user_type: 'staff',
          permissions,
        }
      });
    }

    return NextResponse.json({ user: null });

  } catch (error) {
    console.error('Auth current error:', error);
    return NextResponse.json({ user: null });
  }
}
