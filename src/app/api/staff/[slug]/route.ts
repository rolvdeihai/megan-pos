import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        // 1. Cari user berdasarkan restaurant_slug
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .ilike('restaurant_slug', String(slug || '').trim().toLowerCase())
            .maybeSingle();

        if (userError || !userData) {
            return NextResponse.json(
                { error: 'Restaurant tidak ditemukan' },
                { status: 404 }
            );
        }

        // 2. Ambil list employee aktif
        const { data: employees, error: employeeError } = await supabase
            .from('employees')
            .select('id, full_name, role')
            .eq('user_id', userData.id)
            .eq('is_active', true)
            .order('full_name');

        if (employeeError) throw employeeError;

        return NextResponse.json({ employees });

    } catch (error: any) {
        console.error('List staff error:', error);
        return NextResponse.json(
            { error: error.message || 'Terjadi kesalahan saat memuat daftar karyawan' },
            { status: 500 }
        );
    }
}
