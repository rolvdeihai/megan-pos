import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { PERMISSION_DEFINITIONS } from '@/lib/permissions';

// Reset and reseed permissions to ensure consistency
export async function POST(request: NextRequest) {
  try {
    // 1. Delete old role_permissions first (due to foreign key constraints)
    const { error: deleteRolePermsError } = await supabase
      .from('role_permissions')
      .delete()
      .gte('role_id', '00000000-0000-0000-0000-000000000000');

    if (deleteRolePermsError) {
      console.error('Error deleting role_permissions:', deleteRolePermsError);
    }

    // 2. Delete old permissions
    const { error: deletePermsError } = await supabase
      .from('permissions')
      .delete()
      .gte('code', ' ');

    if (deletePermsError) {
      console.error('Error deleting permissions:', deletePermsError);
    }

    // 3. Insert new permissions from PERMISSION_DEFINITIONS
    const results = [];
    for (const perm of PERMISSION_DEFINITIONS) {
      const { data, error } = await supabase
        .from('permissions')
        .insert({
          code: perm.code,
          description: perm.description
        })
        .select();

      if (error) {
        console.error(`Error inserting permission ${perm.code}:`, error);
        results.push({ code: perm.code, status: 'error', error: error.message });
      } else {
        results.push({ code: perm.code, status: 'success' });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Permissions reset successfully',
      results
    });

  } catch (error) {
    console.error('Reset permissions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
