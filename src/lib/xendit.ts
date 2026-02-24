// src/lib/xendit.ts
import * as crypto from 'crypto';

export interface XenditInvoiceRequest {
  external_id: string;
  amount: number;
  currency?: string;
  description?: string;
  payment_methods?: string[];
  success_redirect_url: string;
  failure_redirect_url: string;
  callback_url: string;
  customer?: {
    given_names: string;
    email: string;
  };
}

export interface XenditInvoiceResponse {
  id: string;
  external_id: string;
  amount: number;
  status: string;
  invoice_url: string;
  expiry_date: string;
  available_payment_methods?: string[];
}

export interface XenditWebhookPayload {
  id: string;
  external_id: string;
  user_id: string;
  status: 'PAID' | 'EXPIRED' | 'PENDING';
  amount: number;
  paid_amount?: number;
  bank_code?: string;
  payment_method?: string;
  paid_at?: string;
  description?: string;
}

const XENDIT_API_KEY = process.env.XENDIT_API_KEY || '';
const XENDIT_MODE = process.env.XENDIT_MODE || 'simulate';
const XENDIT_WEBHOOK_SECRET = process.env.XENDIT_WEBHOOK_SECRET || '';

export function isSimulationMode(): boolean {
  return XENDIT_MODE === 'simulate';
}

export async function createXenditInvoice(
  request: XenditInvoiceRequest
): Promise<XenditInvoiceResponse> {
  if (isSimulationMode()) {
    return {
      id: `sim_${Date.now()}`,
      external_id: request.external_id,
      amount: request.amount,
      status: 'PENDING',
      invoice_url: '#simulate-payment',
      expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      available_payment_methods: ['BCA', 'QRIS', 'DANA', 'OVO', 'LINKAJA'],
    };
  }

  const response = await fetch('https://api.xendit.co/v2/invoices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(XENDIT_API_KEY + ':').toString('base64')}`,
    },
    body: JSON.stringify({
      ...request,
      currency: request.currency || 'IDR',
      payment_methods: request.payment_methods || ['BCA', 'BNI', 'MANDIRI', 'QRIS', 'DANA', 'OVO', 'LINKAJA'],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Xendit API error: ${error}`);
  }

  return response.json();
}

export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (isSimulationMode()) {
    return true;
  }

  if (!XENDIT_WEBHOOK_SECRET) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', XENDIT_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
