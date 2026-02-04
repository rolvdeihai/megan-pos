import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // Cek owner cookie terlebih dahulu
    const ownerCookie = cookieStore.get('megan_pos_auth');
    if (ownerCookie?.value) {
      const authData = JSON.parse(ownerCookie.value);
      const userId = authData.userId;

      const { data: userData, error } = await supabase
        .from('users')
        .select('id, email, full_name, restaurant_name, restaurant_slug')
        .eq('id', userId)
        .single();

      if (error || !userData) {
        return NextResponse.json({ user: null });
      }

      return NextResponse.json({ 
        user: {
          ...userData,
          is_staff: false,
          user_type: 'owner'
        } 
      });
    }

    // Cek staff cookie
    const staffCookie = cookieStore.get('megan_pos_staff');
    if (staffCookie?.value) {
      const authData = JSON.parse(staffCookie.value);
      const userId = authData.userId; // Ini adalah employee.id
      const originalUserId = authData.originalUserId; // Ini adalah user.id (owner)

      // Ambil data employee
      const { data: employeeData, error } = await supabase
        .from('employees')
        .select('id, full_name, role, email, user_id')
        .eq('id', userId)
        .single();

      if (error || !employeeData) {
        return NextResponse.json({ user: null });
      }

      // Ambil data restaurant dari owner
      const { data: userData } = await supabase
        .from('users')
        .select('restaurant_slug, restaurant_name')
        .eq('id', originalUserId)
        .single();

      return NextResponse.json({ 
        user: {
          id: employeeData.id,
          email: employeeData.email || '',
          full_name: employeeData.full_name,
          role: employeeData.role,
          restaurant_slug: userData?.restaurant_slug || '',
          restaurant_name: userData?.restaurant_name || '',
          user_id: employeeData.user_id,
          is_staff: true,
          user_type: 'staff'
        } 
      });
    }

    return NextResponse.json({ user: null });

  } catch (error) {
    console.error('Auth current error:', error);
    return NextResponse.json({ user: null });
  }
}