import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { parseJsonCookie } from '@/lib/cookie-utils';

// GET /api/payrolls - List payrolls for current user
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const ownerCookie = cookieStore.get('megan_pos_auth');
    const staffCookie = cookieStore.get('megan_pos_staff');
    
    let userId: string | null = null;
    
    if (ownerCookie?.value) {
      const authData = parseJsonCookie<{ userId?: string }>(ownerCookie.value);
      userId = authData?.userId || null;
    } else if (staffCookie?.value) {
      const authData = parseJsonCookie<{ originalUserId?: string }>(staffCookie.value);
      userId = authData?.originalUserId || null;
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use RPC to bypass schema cache issue
    const { data: payrollsRaw, error } = await supabaseAdmin.rpc('get_payrolls', {
      p_user_id: userId
    });

    if (error) throw error;
    
    const payrolls = Array.isArray(payrollsRaw) ? payrollsRaw : [];

    // Get employees for mapping
    const { data: employees } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, employee_code, role')
      .eq('user_id', userId);

    const employeesMap = (employees || []).reduce((acc: any, emp: any) => {
      acc[emp.id] = emp;
      return acc;
    }, {});

    const formattedPayrolls = (payrolls || []).map((p: any) => ({
      ...p,
      employee: employeesMap[p.employee_id] || { full_name: 'Unknown', employee_code: '-', role: '-' }
    }));

    return NextResponse.json({ payrolls: formattedPayrolls });
  } catch (error: any) {
    console.error('Error fetching payrolls:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/payrolls - Create new payroll
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const ownerCookie = cookieStore.get('megan_pos_auth');
    const staffCookie = cookieStore.get('megan_pos_staff');
    
    let userId: string | null = null;
    
    if (ownerCookie?.value) {
      const authData = parseJsonCookie<{ userId?: string }>(ownerCookie.value);
      userId = authData?.userId || null;
    } else if (staffCookie?.value) {
      const authData = parseJsonCookie<{ originalUserId?: string }>(staffCookie.value);
      userId = authData?.originalUserId || null;
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { employee_id, period_start, period_end, basic_salary, deductions, net_salary } = body;

    if (!employee_id || !period_start || !period_end) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use RPC to bypass schema cache issue
    const { data, error } = await supabaseAdmin.rpc('create_payroll', {
      p_user_id: userId,
      p_employee_id: employee_id,
      p_period_start: period_start,
      p_period_end: period_end,
      p_basic_salary: basic_salary || 0,
      p_deductions: deductions || 0,
      p_net_salary: net_salary || 0
    });

    if (error) throw error;

    return NextResponse.json({ success: true, payroll: data });
  } catch (error: any) {
    console.error('Error creating payroll:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
