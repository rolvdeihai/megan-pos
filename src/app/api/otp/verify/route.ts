import { NextRequest, NextResponse } from 'next/server';
import { verifyOTP } from '@/lib/otp-service';

export async function POST(request: NextRequest) {
  try {
    const { email, otp, type } = await request.json();

    if (!email || !otp || !type) {
      return NextResponse.json(
        { error: 'Email, OTP, dan type diperlukan' },
        { status: 400 }
      );
    }

    if (!['signup', 'forgot_password'].includes(type)) {
      return NextResponse.json(
        { error: 'Type tidak valid' },
        { status: 400 }
      );
    }

    const result = await verifyOTP(email, otp, type);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP berhasil diverifikasi',
    });

  } catch (error) {
    console.error('Verify OTP API error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat verifikasi OTP' },
      { status: 500 }
    );
  }
}
