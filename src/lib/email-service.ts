// src/lib/email-service.ts
// Email Service using Google Apps Script via Proxy API
// This service sends emails via /api/send-email to bypass CORS

export type EmailType = 'signup' | 'forgot_password' | 'general' | 'new_order';

interface EmailData {
  type: EmailType;
  email: string;
  otp: string;
  name?: string;
}

// Check if running on server or client
const isServer = typeof window === 'undefined';

export async function sendOTPEmail(data: EmailData): Promise<{ success: boolean; error?: string }> {
  try {
    // Server-side: call GAS directly
    if (isServer) {
      const GAS_URL = process.env.GOOGLE_APPS_SCRIPT_EMAIL_URL || process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_EMAIL_URL;
      
      if (!GAS_URL) {
        console.warn('GAS URL not configured, logging only');
        console.log('OTP Email would be sent:', data);
        return { success: true };
      }

      const response = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      // Check if response is actually JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Email service returned non-JSON response:', text.substring(0, 500));
        throw new Error('Email service returned invalid response. Please check the GAS URL configuration.');
      }

      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      return { success: true };
    }
    
    // Client-side: use proxy API
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return { success: true };
  } catch (error) {
    console.error('Email service error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Generate 6 digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// OTP expiration time (10 minutes in milliseconds)
export const OTP_EXPIRATION_MS = 10 * 60 * 1000;

// Send order notification email via proxy API
export async function sendOrderEmail(data: {
  email: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  items: string[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Sending order email to:', data.email, 'Order:', data.orderNumber);

    // Use proxy API to bypass CORS
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'new_order',
        email: data.email,
        orderNumber: data.orderNumber,
        customerName: data.customerName,
        totalAmount: data.totalAmount,
        items: data.items,
      }),
    });

    const result = await response.json();
    console.log('Email proxy response:', result);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }

    console.log('Order email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Order email service error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
