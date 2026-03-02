import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseJsonCookie } from '@/lib/cookie-utils';
import { cookies } from 'next/headers';

// Update role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const cookieStore = await cookies();
    const ownerCookie = cookieStore.get('megan_pos_auth');
    
    if (!ownerCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authData = parseJsonCookie<{ userId?: string }>(ownerCookie.value);
    const userId = authData?.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, permission_codes } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    if (!permission_codes || permission_codes.length === 0) {
      return NextResponse.json({ error: 'At least one permission is required' }, { status: 400 });
    }

    // Verify role belongs to current user
    const { data: existingRole, error: checkError } = await supabase
      .from('roles')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (checkError || !existingRole) {
      return NextResponse.json({ error: 'Role not found or access denied' }, { status: 404 });
    }

    // Update role name
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .update({ name: name.trim() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (roleError) {
      console.error('Error updating role:', roleError);
      return NextResponse.json({ error: roleError.message }, { status: 500 });
    }

    // Delete existing role_permissions
    const { error: deleteError } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', id);

    if (deleteError) {
      console.error('Error deleting old permissions:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Get permission IDs from codes
    const { data: permissions, error: permError } = await supabase
      .from('permissions')
      .select('id, code')
      .in('code', permission_codes);

    if (permError) {
      console.error('Error fetching permissions:', permError);
      return NextResponse.json({ error: permError.message }, { status: 500 });
    }

    // Create new role_permissions
    const rolePermissions = permissions?.map(p => ({
      role_id: id,
      permission_id: p.id,
    }));

    if (rolePermissions && rolePermissions.length > 0) {
      const { error: rpError } = await supabase
        .from('role_permissions')
        .insert(rolePermissions);

      if (rpError) {
        console.error('Error creating role permissions:', rpError);
        return NextResponse.json({ error: rpError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      role: {
        ...role,
        permissions: permissions?.map(p => ({
          id: p.id,
          code: p.code,
        })),
      }
    });

  } catch (error) {
    console.error('PUT role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const cookieStore = await cookies();
    const ownerCookie = cookieStore.get('megan_pos_auth');
    
    if (!ownerCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authData = parseJsonCookie<{ userId?: string }>(ownerCookie.value);
    const userId = authData?.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if role is being used by any employee
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, full_name')
      .eq('role_id', id)
      .limit(1);

    if (empError) {
      console.error('Error checking employees:', empError);
      return NextResponse.json({ error: empError.message }, { status: 500 });
    }

    if (employees && employees.length > 0) {
      return NextResponse.json(
        { error: `Role ini sedang digunakan oleh karyawan: ${employees[0].full_name}. Silakan ubah role karyawan terlebih dahulu.` },
        { status: 400 }
      );
    }

    // Delete role (role_permissions will be cascade deleted)
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting role:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Role deleted successfully' });

  } catch (error) {
    console.error('DELETE role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
