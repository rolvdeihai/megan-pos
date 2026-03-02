// OTP Service for managing OTP verification
import { supabaseAdmin } from './supabase-admin';
import { generateOTP, OTP_EXPIRATION_MS, sendOTPEmail, EmailType } from './email-service';

export interface OTPRecord {
  id?: string;
  email: string;
  otp: string;
  type: 'signup' | 'forgot_password';
  expires_at: string;
  verified: boolean;
  created_at?: string;
}

/**
 * Generate and send OTP
 */
export async function createAndSendOTP(
  email: string,
  type: 'signup' | 'forgot_password',
  name?: string
): Promise<{ success: boolean; error?: string; otp?: string }> {
  try {
    // Generate OTP
    const otp = generateOTP();
    
    // Calculate expiration (10 minutes from now)
    const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MS);

    // Delete any existing OTP for this email and type
    await supabaseAdmin
      .from('otps')
      .delete()
      .eq('email', email)
      .eq('type', type);

    // Insert new OTP record
    const { error: insertError } = await supabaseAdmin
      .from('otps')
      .insert({
        email,
        otp,
        type,
        expires_at: expiresAt.toISOString(),
        verified: false,
      });

    if (insertError) {
      throw new Error(`Failed to save OTP: ${insertError.message}`);
    }

    // Send email via Google Apps Script
    const emailResult = await sendOTPEmail({
      type: type === 'signup' ? 'signup' : 'forgot_password',
      email,
      otp,
      name,
    });

    if (!emailResult.success) {
      console.warn('Email sending failed, but OTP was saved:', emailResult.error);
    }

    return { success: true, otp };
  } catch (error) {
    console.error('Create OTP error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create OTP',
    };
  }
}

/**
 * Verify OTP
 */
export async function verifyOTP(
  email: string,
  otp: string,
  type: 'signup' | 'forgot_password'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find valid OTP record
    const { data: otpRecord, error: fetchError } = await supabaseAdmin
      .from('otps')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .eq('type', type)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (fetchError || !otpRecord) {
      return { success: false, error: 'Kode OTP tidak valid atau sudah kadaluarsa' };
    }

    // Mark as verified
    const { error: updateError } = await supabaseAdmin
      .from('otps')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    if (updateError) {
      throw new Error(`Failed to verify OTP: ${updateError.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Verify OTP error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify OTP',
    };
  }
}

/**
 * Clean up expired OTPs (can be called periodically)
 */
export async function cleanupExpiredOTPs(): Promise<void> {
  try {
    await supabaseAdmin
      .from('otps')
      .delete()
      .lt('expires_at', new Date().toISOString());
  } catch (error) {
    console.error('Cleanup OTPs error:', error);
  }
}
