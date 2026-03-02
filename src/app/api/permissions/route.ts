import { NextRequest, NextResponse } from 'next/server';
import { PERMISSION_DEFINITIONS } from '@/lib/permissions';
import { cookies } from 'next/headers';
import { parseJsonCookie } from '@/lib/cookie-utils';

// Get all available permissions
export async function GET(request: NextRequest) {
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

    // Return permission definitions from constants
    const permissions = PERMISSION_DEFINITIONS.map(p => ({
      code: p.code,
      label: p.label,
      description: p.description,
    }));

    return NextResponse.json({ permissions });

  } catch (error) {
    console.error('GET permissions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
