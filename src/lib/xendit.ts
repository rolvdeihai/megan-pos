// src/lib/xendit.ts
// Xendit SDK integration for Megan POS
// Docs: https://github.com/xendit/xendit-node

import type {
  CreateInvoiceRequest,
  Invoice,
  InvoiceCallback,
} from 'xendit-node/invoice/models';
import * as crypto from 'crypto';

// Environment configuration
const XENDIT_API_KEY = process.env.XENDIT_API_KEY || '';
const XENDIT_MODE = process.env.XENDIT_MODE || 'live';
const XENDIT_WEBHOOK_SECRET = process.env.XENDIT_WEBHOOK_SECRET || '';

// Lazy-loaded Xendit SDK client
// Only initialized when NOT in simulation mode
// This prevents SDK validation errors during development
let _xenditClient: any = null;

function getXenditClient(): any {
  if (_xenditClient) {
    return _xenditClient;
  }

  // Dynamic import to prevent SDK initialization errors in simulation mode
  const { Xendit } = require('xendit-node');
  _xenditClient = new Xendit({
    secretKey: XENDIT_API_KEY,
  });
  return _xenditClient;
}

/**
 * Check if running in simulation mode (development/testing)
 * Uses PAYMENT_GATEWAY env var if set, falls back to XENDIT_MODE for backwards compatibility
 */
export function isSimulationMode(): boolean {
  const paymentGateway = process.env.PAYMENT_GATEWAY;
  // If PAYMENT_GATEWAY is set, use it
  if (paymentGateway) {
    return paymentGateway === 'simulate';
  }
  // Fallback to legacy XENDIT_MODE for backwards compatibility
  return XENDIT_MODE === 'simulate';
}

/**
 * Create a Xendit Invoice
 * Docs: https://developers.xendit.co/api-reference/#create-invoice
 */
export async function createXenditInvoice(
  params: {
    external_id: string;
    amount: number;
    description?: string;
    payment_methods?: string[];
    success_redirect_url: string;
    failure_redirect_url: string;
    callback_url: string;
    currency?: string;
    invoice_duration?: number;
    customer?: {
      given_names: string;
      email: string;
    };
  }
): Promise<Invoice> {
  // Simulation mode: return mock response for development
  if (isSimulationMode()) {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + (params.invoice_duration || 86400) * 1000);

    // Return partial Invoice for simulation (casting for dev convenience)
    return {
      id: `sim_${Date.now()}`,
      externalId: params.external_id,
      userId: 'sim_user',
      status: 'PENDING' as any,
      merchantName: 'Megan POS (Simulation)',
      merchantProfilePictureUrl: '',
      amount: params.amount,
      expiryDate,
      invoiceUrl: `${params.callback_url.replace('/api/webhooks/xendit', '')}/payment/pending?invoice_id=sim_${Date.now()}&subscription_id=${params.external_id}&method=SIMULATED`,
      availableBanks: [],
      availableRetailOutlets: [],
      availableEwallets: [],
      availableQrCodes: [],
      availableDirectDebits: [],
      availablePaylaters: [],
      shouldSendEmail: false,
      created: now,
      updated: now,
    } as unknown as Invoice;
  }

  // Build SDK request payload
  // Docs: https://developers.xendit.co/api-reference/#create-invoice-request
  const request: CreateInvoiceRequest = {
    externalId: params.external_id,
    amount: params.amount,
    description: params.description || 'Megan POS Subscription',
    currency: (params.currency as any) || 'IDR',
    invoiceDuration: params.invoice_duration || 86400, // 24 hours in seconds
    successRedirectUrl: params.success_redirect_url,
    failureRedirectUrl: params.failure_redirect_url,
    paymentMethods: params.payment_methods,
    customer: params.customer
      ? {
          givenNames: params.customer.given_names,
          email: params.customer.email,
        }
      : undefined,
    shouldSendEmail: false,
  };

  try {
    // Create invoice using Xendit SDK
    const xenditClient = getXenditClient();
    const invoice = await xenditClient.Invoice.createInvoice({ data: request });
    return invoice;
  } catch (error: any) {
    console.error('Xendit SDK Error:', error);
    throw new Error(`Failed to create invoice: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get invoice by ID
 * Docs: https://developers.xendit.co/api-reference/#get-invoice
 */
export async function getInvoice(invoiceId: string): Promise<Invoice> {
  if (isSimulationMode()) {
    throw new Error('Simulation mode: Cannot retrieve invoice from API');
  }

  try {
    const xenditClient = getXenditClient();
    const invoice = await xenditClient.Invoice.getInvoiceById({ invoiceId });
    return invoice;
  } catch (error: any) {
    console.error('Xendit SDK Error:', error);
    throw new Error(`Failed to get invoice: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get all invoices with optional filters
 * Docs: https://developers.xendit.co/api-reference/#get-all-invoices
 */
export async function getInvoices(filters?: {
  externalId?: string;
  statuses?: string[];
  limit?: number;
}): Promise<Invoice[]> {
  if (isSimulationMode()) {
    return [];
  }

  try {
    const xenditClient = getXenditClient();
    const invoices = await xenditClient.Invoice.getInvoices({
      externalId: filters?.externalId,
      statuses: filters?.statuses as any,
      limit: filters?.limit,
    });
    return invoices;
  } catch (error: any) {
    console.error('Xendit SDK Error:', error);
    throw new Error(`Failed to get invoices: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Expire an invoice manually
 * Docs: https://developers.xendit.co/api-reference/#expire-invoice
 */
export async function expireInvoice(invoiceId: string): Promise<Invoice> {
  if (isSimulationMode()) {
    throw new Error('Simulation mode: Cannot expire invoice via API');
  }

  try {
    const xenditClient = getXenditClient();
    const invoice = await xenditClient.Invoice.expireInvoice({ invoiceId });
    return invoice;
  } catch (error: any) {
    console.error('Xendit SDK Error:', error);
    throw new Error(`Failed to expire invoice: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Verify webhook callback signature
 * Docs: https://developers.xendit.co/api-reference/#callbacks
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  // Always accept in simulation mode
  if (isSimulationMode()) {
    return true;
  }

  if (!XENDIT_WEBHOOK_SECRET) {
    console.warn('XENDIT_WEBHOOK_SECRET not configured');
    return false;
  }

  try {
    // Xendit uses x-callback-token header for webhook verification
    // The token is compared directly (not HMAC)
    // Ref: https://developers.xendit.co/api-reference/#callback-security
    return signature === XENDIT_WEBHOOK_SECRET;
  } catch (error) {
    console.error('Webhook verification error:', error);
    return false;
  }
}

/**
 * Parse and validate webhook callback payload
 */
export function parseWebhookPayload(body: string): InvoiceCallback {
  try {
    const payload: InvoiceCallback = JSON.parse(body);
    return payload;
  } catch (error) {
    throw new Error('Invalid JSON in webhook payload');
  }
}

// Re-export types for use in other modules
export type { Invoice, InvoiceCallback, CreateInvoiceRequest };

// Payment method codes supported by Xendit
// Docs: https://developers.xendit.co/api-reference/#payment-methods
export const PAYMENT_METHODS = {
  // Virtual Accounts
  BCA: 'BCA',
  BNI: 'BNI',
  BRI: 'BRI',
  MANDIRI: 'MANDIRI',
  PERMATA: 'PERMATA',
  SAHABAT_SAMPOERNA: 'SAHABAT_SAMPOERNA',
  CIMB: 'CIMB',
  BSIX: 'BSI',

  // E-Wallets
  OVO: 'OVO',
  DANA: 'DANA',
  LINKAJA: 'LINKAJA',
  SHOPEEPAY: 'SHOPEEPAY',
  ASTRAPAY: 'ASTRAPAY',
  JENIUSPAY: 'JENIUSPAY',

  // QRIS
  QRIS: 'QRIS',

  // Retail Outlets
  ALFAMART: 'ALFAMART',
  INDOMARET: 'INDOMARET',

  // Credit Card
  CREDIT_CARD: 'CREDIT_CARD',
} as const;

export type PaymentMethodCode = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];
