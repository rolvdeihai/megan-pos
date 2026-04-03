// src/lib/payment-gateway.ts
// Payment Gateway Abstraction Layer
// Supports: 'simulate', 'xendit', 'midtrans'
// Configure via PAYMENT_GATEWAY env var

export type PaymentGateway = 'simulate' | 'xendit' | 'midtrans';

const PAYMENT_GATEWAY = (process.env.PAYMENT_GATEWAY || 'simulate') as PaymentGateway;

export function getPaymentGateway(): PaymentGateway {
  return PAYMENT_GATEWAY;
}

export function isSimulationMode(): boolean {
  return PAYMENT_GATEWAY === 'simulate';
}

// Unified invoice interface (gateway-agnostic)
export interface PaymentInvoice {
  id: string;
  externalId: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';
  invoiceUrl: string;
  paymentMethod?: string;
  expiryDate?: Date;
}

// Create invoice params (common across gateways)
export interface CreateInvoiceParams {
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

// Webhook payload parsed from gateway
export interface WebhookPayload {
  external_id: string;
  status: 'PAID' | 'EXPIRED' | 'PENDING' | 'FAILED';
  payment_method?: string;
  payment_channel?: string;
  paid_at?: string;
  gateway_id: string; // gateway-specific invoice/transaction ID
}

// --- Simulation Implementation ---

function createSimulatedInvoice(params: CreateInvoiceParams): PaymentInvoice {
  const now = new Date();
  const expiryDate = new Date(now.getTime() + (params.invoice_duration || 86400) * 1000);
  const simId = `sim_${Date.now()}`;

  return {
    id: simId,
    externalId: params.external_id,
    amount: params.amount,
    status: 'PENDING',
    invoiceUrl: `${params.callback_url.replace('/api/webhooks', '')}/payment/pending?invoice_id=${simId}&subscription_id=${params.external_id}&method=SIMULATED&simulation=1`,
    expiryDate,
  };
}

function verifySimulatedWebhook(_payload: string, _signature: string): boolean {
  return true; // Always accept in simulation mode
}

function parseSimulatedWebhook(body: any): WebhookPayload {
  return {
    external_id: body.external_id || body.externalId || '',
    status: body.status || 'PENDING',
    payment_method: body.payment_method || body.paymentMethod,
    gateway_id: body.gateway_id || body.id || `sim_${Date.now()}`,
    paid_at: body.paid_at || body.paidAt,
  };
}

// --- Gateway-agnostic API ---

export async function createInvoice(params: CreateInvoiceParams): Promise<PaymentInvoice> {
  switch (PAYMENT_GATEWAY) {
    case 'xendit': {
      const { createXenditInvoice } = await import('./gateways/xendit-adapter');
      return createXenditInvoice(params);
    }
    case 'midtrans': {
      const { createMidtransInvoice } = await import('./gateways/midtrans-adapter');
      return createMidtransInvoice(params);
    }
    case 'simulate':
    default:
      return createSimulatedInvoice(params);
  }
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  switch (PAYMENT_GATEWAY) {
    case 'xendit': {
      const { verifyXenditWebhook } = require('./gateways/xendit-adapter');
      return verifyXenditWebhook(payload, signature);
    }
    case 'midtrans': {
      const { verifyMidtransWebhook } = require('./gateways/midtrans-adapter');
      return verifyMidtransWebhook(payload, signature);
    }
    case 'simulate':
    default:
      return verifySimulatedWebhook(payload, signature);
  }
}

export function parseWebhookPayload(body: string): WebhookPayload {
  const parsed = JSON.parse(body);
  switch (PAYMENT_GATEWAY) {
    case 'xendit': {
      const { parseXenditWebhook } = require('./gateways/xendit-adapter');
      return parseXenditWebhook(parsed);
    }
    case 'midtrans': {
      const { parseMidtransWebhook } = require('./gateways/midtrans-adapter');
      return parseMidtransWebhook(parsed);
    }
    case 'simulate':
    default:
      return parseSimulatedWebhook(parsed);
  }
}

// --- Payment Method Mapping ---
// Maps unified method IDs to gateway-specific codes

export interface PaymentMethod {
  id: string;
  name: string;
  category: 'va' | 'qris' | 'ewallet';
  icon: string;
  description: string;
}

// Unified payment methods that work across gateways
export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'BCA',
    name: 'BCA Virtual Account',
    category: 'va',
    icon: '🏦',
    description: 'Transfer dari BCA',
  },
  {
    id: 'BNI',
    name: 'BNI Virtual Account',
    category: 'va',
    icon: '🏦',
    description: 'Transfer dari BNI',
  },
  {
    id: 'MANDIRI',
    name: 'Mandiri Virtual Account',
    category: 'va',
    icon: '🏦',
    description: 'Transfer dari Mandiri',
  },
  {
    id: 'QRIS',
    name: 'QRIS',
    category: 'qris',
    icon: '📱',
    description: 'Scan QR dengan aplikasi pembayaran',
  },
  {
    id: 'DANA',
    name: 'DANA',
    category: 'ewallet',
    icon: '💳',
    description: 'Bayar dengan DANA',
  },
  {
    id: 'OVO',
    name: 'OVO',
    category: 'ewallet',
    icon: '💳',
    description: 'Bayar dengan OVO',
  },
  {
    id: 'LINKAJA',
    name: 'LinkAja',
    category: 'ewallet',
    icon: '💳',
    description: 'Bayar dengan LinkAja',
  },
];

// Gateway-specific payment method code mapping
const XENDIT_METHOD_MAP: Record<string, string> = {
  BCA: 'BCA',
  BNI: 'BNI',
  MANDIRI: 'MANDIRI',
  QRIS: 'QRIS',
  DANA: 'DANA',
  OVO: 'OVO',
  LINKAJA: 'LINKAJA',
};

const MIDTRANS_METHOD_MAP: Record<string, string> = {
  BCA: 'bca_va',
  BNI: 'bni_va',
  MANDIRI: 'mandiri_va',
  QRIS: 'qris',
  DANA: 'dana',
  OVO: 'ovo',
  LINKAJA: 'gopay',
};

export function getGatewayMethodCode(methodId: string): string {
  switch (PAYMENT_GATEWAY) {
    case 'xendit':
      return XENDIT_METHOD_MAP[methodId] || methodId;
    case 'midtrans':
      return MIDTRANS_METHOD_MAP[methodId] || methodId;
    default:
      return methodId;
  }
}
