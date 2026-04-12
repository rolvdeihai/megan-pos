// src/lib/gateways/midtrans-adapter.ts
// Midtrans integration adapter for the payment gateway abstraction
// Uses the midtrans-client SDK
// Docs: https://docs.midtrans.com/en/welcome/index.html

import Midtrans from 'midtrans-client';
import * as crypto from 'crypto';
import type { CreateInvoiceParams, PaymentInvoice, WebhookPayload } from '../payment-gateway';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || '';
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';

// Lazy-loaded Midtrans Snap client
let _snapClient: InstanceType<typeof Midtrans.Snap> | null = null;

function getSnapClient(): InstanceType<typeof Midtrans.Snap> {
  if (!_snapClient) {
    _snapClient = new Midtrans.Snap({
      isProduction: MIDTRANS_IS_PRODUCTION,
      serverKey: MIDTRANS_SERVER_KEY,
      clientKey: MIDTRANS_CLIENT_KEY,
    });
  }
  return _snapClient;
}

export async function createMidtransInvoice(params: CreateInvoiceParams): Promise<PaymentInvoice> {
  const snap = getSnapClient();
  const durationSeconds = params.invoice_duration || 86400;
  const primaryMethod = params.payment_methods?.[0];

  const successUrl = new URL(params.success_redirect_url);
  successUrl.searchParams.set('subscription_id', params.external_id);
  if (primaryMethod) {
    successUrl.searchParams.set('method', primaryMethod);
  }

  const failureUrl = new URL(params.failure_redirect_url);
  failureUrl.searchParams.set('subscription_id', params.external_id);
  if (primaryMethod) {
    failureUrl.searchParams.set('method', primaryMethod);
  }

  const pendingUrl = new URL(successUrl.toString());
  pendingUrl.searchParams.set('status', 'pending');

  // Build Snap transaction parameter
  // Docs: https://snap-docs.midtrans.com/#json-objects
  const parameter: Record<string, any> = {
    transaction_details: {
      order_id: params.external_id,
      gross_amount: params.amount,
    },
    item_details: [
      {
        id: params.external_id,
        price: params.amount,
        quantity: 1,
        name: params.description || 'Megan POS Subscription',
      },
    ],
    // Set notification URL for webhook callbacks
    // Docs: https://snap-docs.midtrans.com/#override-notification-url
    callbacks: {
      finish: successUrl.toString(),
      error: failureUrl.toString(),
      pending: pendingUrl.toString(),
    },
  };

  // Add customer details if provided
  if (params.customer) {
    parameter.customer_details = {
      first_name: params.customer.given_names,
      email: params.customer.email,
    };
  }

  // Filter payment methods if specified
  if (params.payment_methods && params.payment_methods.length > 0) {
    parameter.enabled_payments = params.payment_methods.map(mapToMidtransMethod);
  }

  // Set transaction expiry
  parameter.expiry = {
    unit: 'minutes',
    duration: Math.ceil(durationSeconds / 60),
  };

  try {
    if (params.callback_url) {
      snap.httpClient.http_client.defaults.headers.common['X-Override-Notification'] = params.callback_url;
    }

    // Add timeout to prevent hanging (30 seconds)
    snap.httpClient.http_client.defaults.timeout = 30000;

    console.log('[Midtrans] Creating transaction:', { order_id: parameter.transaction_details.order_id, amount: parameter.transaction_details.gross_amount });

    const transaction = await snap.createTransaction(parameter);

    console.log('[Midtrans] Transaction created:', { token: transaction.token, redirect_url: transaction.redirect_url });

    return {
      id: transaction.token,
      externalId: params.external_id,
      amount: params.amount,
      status: 'PENDING',
      invoiceUrl: transaction.redirect_url,
      expiryDate: new Date(Date.now() + durationSeconds * 1000),
    };
  } catch (error: any) {
    console.error('[Midtrans] SDK Error:', error?.message || error, error?.response?.data || '');
    throw new Error(`Failed to create Midtrans transaction: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Verify Midtrans webhook notification signature
 * Docs: https://docs.midtrans.com/en/after-payment/http-notification
 * 
 * Signature = SHA512(order_id + status_code + gross_amount + server_key)
 */
export function verifyMidtransWebhook(payload: string, signature: string): boolean {
  if (!MIDTRANS_SERVER_KEY) {
    console.warn('MIDTRANS_SERVER_KEY not configured, skipping verification');
    return false;
  }

  try {
    const notification = JSON.parse(payload);
    const order_id = notification.order_id;
    const status_code = notification.status_code;
    const gross_amount = notification.gross_amount;

    if (!order_id || !status_code || !gross_amount) {
      console.warn('Missing required fields for signature verification');
      return false;
    }

    // Compute SHA512 hash as per Midtrans docs
    const expectedSignature = crypto
      .createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`)
      .digest('hex');

    const providedSignature = Buffer.from(signature, 'hex');
    const expectedSignatureBuffer = Buffer.from(expectedSignature, 'hex');

    if (providedSignature.length !== expectedSignatureBuffer.length) {
      console.warn('Midtrans webhook signature length mismatch');
      return false;
    }

    const isValid = crypto.timingSafeEqual(
      providedSignature,
      expectedSignatureBuffer
    );
    if (!isValid) {
      console.warn('Midtrans webhook signature mismatch');
    }
    return isValid;
  } catch (error) {
    console.error('Midtrans webhook verification error:', error);
    return false;
  }
}

/**
 * Parse Midtrans notification into webhook payload
 * Docs: https://docs.midtrans.com/en/after-payment/http-notification
 * 
 * Transaction statuses:
 * - capture: Credit card transaction captured
 * - settlement: Transaction settled
 * - pending: Transaction pending
 * - deny: Transaction denied
 * - cancel: Transaction cancelled  
 * - expire: Transaction expired
 * - refund: Transaction refunded
 */
export function parseMidtransWebhook(body: any): WebhookPayload {
  const transactionStatus = body.transaction_status;
  const fraudStatus = body.fraud_status;

  let status: 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED' = 'PENDING';

  // Handle different transaction statuses
  // Docs: https://docs.midtrans.com/en/after-payment/http-notification?id=sample-of-different-payment-channels
  if (transactionStatus === 'capture') {
    // Credit card specific - check fraud status
    if (fraudStatus === 'accept') {
      status = 'PAID';
    } else if (fraudStatus === 'challenge') {
      status = 'PENDING';
    } else {
      status = 'FAILED';
    }
  } else if (transactionStatus === 'settlement') {
    // Non-credit card success
    status = 'PAID';
  } else if (transactionStatus === 'pending') {
    status = 'PENDING';
  } else if (transactionStatus === 'cancel') {
    status = 'FAILED';
  } else if (transactionStatus === 'deny') {
    status = 'FAILED';
  } else if (transactionStatus === 'expire') {
    status = 'EXPIRED';
  } else if (transactionStatus === 'refund') {
    // Treat refund as failed/expired
    status = 'FAILED';
  }

  return {
    external_id: body.order_id || '',
    status,
    payment_method: body.payment_type || 'unknown',
    payment_channel: body.payment_type || 'unknown',
    paid_at: body.settlement_time || body.transaction_time || new Date().toISOString(),
    gateway_id: body.transaction_id || body.order_id || '',
  };
}

/**
 * Map unified payment method codes to Midtrans-specific ones
 * Docs: https://snap-docs.midtrans.com/#payment-channel
 */
function mapToMidtransMethod(methodId: string): string {
  const mapping: Record<string, string> = {
    BCA: 'bca_va',
    BNI: 'bni_va',
    MANDIRI: 'mandiri_va',
    BRI: 'bri_va',
    PERMATA: 'permata_va',
    QRIS: 'qris',
    DANA: 'dana',
    OVO: 'ovo',
    GOPAY: 'gopay',
    SHOPEEPAY: 'shopee_pay',
    CREDIT_CARD: 'credit_card',
  };
  return mapping[methodId] || methodId.toLowerCase();
}
