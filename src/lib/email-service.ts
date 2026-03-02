// Email Service using Google Apps Script via Proxy API
// This service sends emails via /api/send-email to bypass CORS

export type EmailType = 'signup' | 'forgot_password' | 'general' | 'new_order';

interface EmailData {
  type: EmailType;
  email: string;
  otp: string;
  name?: string;
}

export async function sendOTPEmail(data: EmailData): Promise<{ success: boolean; error?: string }> {
  try {
    // Use proxy API to bypass CORS
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }

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
