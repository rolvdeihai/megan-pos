import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseJsonCookie } from '@/lib/cookie-utils';
import { cookies } from 'next/headers';

// Get all roles with permissions for current user
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const ownerCookie = cookieStore.get('megan_pos_auth');
    
    console.log('Roles API - Cookie found:', !!ownerCookie?.value);
    
    if (!ownerCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized - No auth cookie' }, { status: 401 });
    }

    const authData = parseJsonCookie<{ userId?: string }>(ownerCookie.value);
    const userId = authData?.userId;
    
    console.log('Roles API - UserId:', userId);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - No userId in cookie' }, { status: 401 });
    }

    // Fetch roles with their permissions
    const { data: roles, error } = await supabase
      .from('roles')
      .select(`
        *,
        role_permissions(
          permission_id,
          permissions(code, description)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching roles:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format roles with permission codes
    const formattedRoles = roles?.map(role => ({
      ...role,
      permissions: role.role_permissions?.map((rp: any) => ({
        id: rp.permission_id,
        code: rp.permissions?.code,
        description: rp.permissions?.description,
      })) || [],
    }));

    return NextResponse.json({ roles: formattedRoles });

  } catch (error) {
    console.error('GET roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create new role
export async function POST(request: NextRequest) {
  try {
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

    // Create role
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .insert({
        name: name.trim(),
        user_id: userId,
      })
      .select()
      .single();

    if (roleError) {
      console.error('Error creating role:', roleError);
      return NextResponse.json({ error: roleError.message }, { status: 500 });
    }

    // Get permission IDs from codes
    const { data: permissions, error: permError } = await supabase
      .from('permissions')
      .select('id, code')
      .in('code', permission_codes);

    if (permError) {
      console.error('Error fetching permissions:', permError);
      // Rollback: delete the role
      await supabase.from('roles').delete().eq('id', role.id);
      return NextResponse.json({ error: permError.message }, { status: 500 });
    }

    // Create role_permissions
    const rolePermissions = permissions?.map(p => ({
      role_id: role.id,
      permission_id: p.id,
    }));

    if (rolePermissions && rolePermissions.length > 0) {
      const { error: rpError } = await supabase
        .from('role_permissions')
        .insert(rolePermissions);

      if (rpError) {
        console.error('Error creating role permissions:', rpError);
        // Rollback: delete the role
        await supabase.from('roles').delete().eq('id', role.id);
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
    console.error('POST roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
