// src/lib/gateways/xendit-adapter.ts
// Adapts the existing Xendit integration to the payment gateway abstraction

import { createXenditInvoice as rawCreateXenditInvoice, verifyWebhookSignature as rawVerifyWebhook } from '../xendit';
import type { CreateInvoiceParams, PaymentInvoice, WebhookPayload } from '../payment-gateway';

const XENDIT_WEBHOOK_SECRET = process.env.XENDIT_WEBHOOK_SECRET || '';

export async function createXenditInvoice(params: CreateInvoiceParams): Promise<PaymentInvoice> {
  const invoice = await rawCreateXenditInvoice(params);

  return {
    id: invoice.id || `xendit_${Date.now()}`,
    externalId: invoice.externalId || params.external_id,
    amount: invoice.amount || params.amount,
    status: mapXenditStatus(invoice.status),
    invoiceUrl: invoice.invoiceUrl || '',
    expiryDate: invoice.expiryDate,
  };
}

export function verifyXenditWebhook(_payload: string, signature: string): boolean {
  // Xendit uses x-callback-token for verification
  // The verifyWebhookSignature function from xendit.ts handles this
  if (!XENDIT_WEBHOOK_SECRET) {
    console.warn('XENDIT_WEBHOOK_SECRET not configured');
    return false;
  }
  return signature === XENDIT_WEBHOOK_SECRET;
}

export function parseXenditWebhook(body: any): WebhookPayload {
  return {
    external_id: body.externalId || body.external_id || '',
    status: mapXenditStatus(body.status),
    payment_method: body.paymentMethod || body.payment_method,
    payment_channel: body.paymentChannel || body.payment_channel,
    paid_at: body.paidAt || body.paid_at,
    gateway_id: body.id || '',
  };
}

function mapXenditStatus(status: string | undefined): 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED' {
  switch (status?.toUpperCase()) {
    case 'PAID':
      return 'PAID';
    case 'EXPIRED':
      return 'EXPIRED';
    case 'FAILED':
      return 'FAILED';
    case 'PENDING':
    default:
      return 'PENDING';
  }
}
