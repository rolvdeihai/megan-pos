import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { PERMISSION_DEFINITIONS } from '@/lib/permissions';

// Seed permissions to database
export async function POST(request: NextRequest) {
  try {
    const results = [];
    
    for (const perm of PERMISSION_DEFINITIONS) {
      // Upsert permission (insert if not exists, ignore if exists)
      const { data, error } = await supabase
        .from('permissions')
        .upsert(
          { 
            code: perm.code, 
            description: perm.description 
          },
          { 
            onConflict: 'code',
            ignoreDuplicates: true 
          }
        )
        .select();

      if (error) {
        console.error(`Error seeding permission ${perm.code}:`, error);
        results.push({ code: perm.code, status: 'error', error: error.message });
      } else {
        results.push({ code: perm.code, status: 'success' });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Permissions seeded successfully',
      results 
    });

  } catch (error) {
    console.error('Seed permissions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get seed status
export async function GET(request: NextRequest) {
  try {
    const { data: permissions, error } = await supabase
      .from('permissions')
      .select('code, description');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const expectedCount = PERMISSION_DEFINITIONS.length;
    const actualCount = permissions?.length || 0;

    return NextResponse.json({
      seeded: actualCount >= expectedCount,
      expected: expectedCount,
      actual: actualCount,
      permissions: permissions || [],
      missing: PERMISSION_DEFINITIONS
        .filter(p => !permissions?.some(db => db.code === p.code))
        .map(p => p.code),
    });

  } catch (error) {
    console.error('Get permissions status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
