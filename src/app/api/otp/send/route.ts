import { NextRequest, NextResponse } from 'next/server';
import { createAndSendOTP } from '@/lib/otp-service';

export async function POST(request: NextRequest) {
  try {
    const { email, type, name } = await request.json();

    console.log('=== OTP REQUEST ===');
    console.log('Email:', email);
    console.log('Type:', type);
    console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('SERVICE_ROLE_KEY first 20 chars:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...');
    console.log('SERVICE_ROLE_KEY includes service_role?', process.env.SUPABASE_SERVICE_ROLE_KEY?.includes('service_role'));

    if (!email || !type) {
      return NextResponse.json(
        { error: 'Email dan type diperlukan' },
        { status: 400 }
      );
    }

    if (!['signup', 'forgot_password'].includes(type)) {
      return NextResponse.json(
        { error: 'Type tidak valid' },
        { status: 400 }
      );
    }

    const result = await createAndSendOTP(email, type, name);
    
    console.log('=== OTP RESULT ===');
    console.log('Success:', result.success);
    console.log('Error:', result.error);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Development mode: return OTP in response
    const isDev = process.env.NODE_ENV === 'development';
    
    return NextResponse.json({
      success: true,
      message: 'OTP berhasil dikirim ke email Anda',
      ...(isDev && result.otp ? { otp: result.otp } : {}),
    });

  } catch (error: any) {
    console.error('=== OTP API ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat mengirim OTP' },
      { status: 500 }
    );
  }
}
