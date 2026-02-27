# Xendit SDK Integration

This project uses the official [`xendit-node`](https://github.com/xendit/xendit-node) SDK (v7.0.0) for payment processing.

## Installation

```bash
npm install xendit-node
```

## Configuration

Environment variables in `.env.local`:

```env
# Xendit Payment Configuration
XENDIT_API_KEY=xnd_development_your_key_here      # Your Xendit secret key
XENDIT_WEBHOOK_SECRET=whsec_your_secret_here     # Webhook callback token
XENDIT_MODE=simulate                               # 'simulate' for local testing, 'live' for real payment
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Mode-based Checkout Flow

### `XENDIT_MODE=simulate`

- Checkout creates `pending_payment` subscription locally
- User is routed to `/payment/pending`
- Use simulation buttons on pending page to trigger:
  - **Simulasikan Sukses** -> activate subscription
  - **Simulasikan Gagal** -> mark subscription as expired

### `XENDIT_MODE=live`

- Checkout creates real Xendit invoice
- User is redirected to hosted `invoiceUrl` from Xendit
- Xendit success/failure redirects return to:
  - `/dashboard/billing?status=success&order_id=<subscriptionId>`
  - `/dashboard/billing?status=failed&order_id=<subscriptionId>`

## SDK Client Setup

```typescript
import { Xendit } from 'xendit-node';

const xenditClient = new Xendit({
  secretKey: process.env.XENDIT_API_KEY,
});
```

## Available APIs

The SDK provides these main APIs:

| API | Access | Purpose |
|-----|--------|---------|
| `xenditClient.Invoice` | `InvoiceApi` | Create and manage invoices |
| `xenditClient.PaymentRequest` | `PaymentRequestApi` | Payment requests |
| `xenditClient.PaymentMethod` | `PaymentMethodApi` | Payment methods |
| `xenditClient.Customer` | `CustomerApi` | Customer management |
| `xenditClient.Refund` | `RefundApi` | Refund processing |
| `xenditClient.Payout` | `PayoutApi` | Disbursements |
| `xenditClient.Transaction` | `TransactionApi` | Transaction history |
| `xenditClient.Balance` | `BalanceApi` | Account balance |

## Current Implementation

### Invoice API

Located in `src/lib/xendit.ts`:

```typescript
import { createXenditInvoice, getInvoice, getInvoices, expireInvoice } from '@/lib/xendit';
import type { Invoice, InvoiceCallback, CreateInvoiceRequest } from '@/lib/xendit';

// Create invoice
const invoice = await createXenditInvoice({
  external_id: 'sub_123',
  amount: 500000,
  description: 'Pro Package - Megan POS',
  currency: 'IDR',
  invoice_duration: 86400, // 24 hours
  success_redirect_url: 'https://yoursite.com/success',
  failure_redirect_url: 'https://yoursite.com/failed',
  callback_url: 'https://yoursite.com/api/webhooks/xendit',
  payment_methods: ['BCA', 'BNI', 'QRIS', 'DANA', 'OVO'],
  customer: {
    given_names: 'John Doe',
    email: 'john@example.com',
  },
});

// Returns Invoice type with properties:
// - id: string
// - externalId: string
// - invoiceUrl: string (payment URL)
// - status: InvoiceStatus
// - expiryDate: Date
// - availableBanks: Bank[]
// - availableEwallets: Ewallet[]
// - etc.
```

### Webhook Handling

Located in `src/app/api/webhooks/xendit/route.ts`:

```typescript
import { verifyWebhookSignature, parseWebhookPayload } from '@/lib/xendit';
import type { InvoiceCallback } from '@/lib/xendit';

// Verify signature (uses x-callback-token header)
const isValid = verifyWebhookSignature(payload, signature);

// Parse webhook payload
const data: InvoiceCallback = parseWebhookPayload(body);

// Available properties:
// - id: string (Xendit invoice ID)
// - externalId: string (your reference ID)
// - status: 'PAID' | 'EXPIRED' | 'PENDING'
// - amount: number
// - paidAmount: number
// - paymentMethod: string
// - paymentChannel: string
// - paidAt: string
// - etc.
```

## Payment Methods

Supported payment methods (defined in `src/lib/xendit.ts`):

```typescript
export const PAYMENT_METHODS = {
  // Virtual Accounts
  BCA: 'BCA',
  BNI: 'BNI',
  BRI: 'BRI',
  MANDIRI: 'MANDIRI',
  PERMATA: 'PERMATA',
  CIMB: 'CIMB',
  BSIX: 'BSI',

  // E-Wallets
  OVO: 'OVO',
  DANA: 'DANA',
  LINKAJA: 'LINKAJA',
  SHOPEEPAY: 'SHOPEEPAY',
  ASTRAPAY: 'ASTRAPAY',

  // QRIS
  QRIS: 'QRIS',

  // Retail Outlets
  ALFAMART: 'ALFAMART',
  INDOMARET: 'INDOMARET',

  // Credit Card
  CREDIT_CARD: 'CREDIT_CARD',
} as const;
```

## Simulation Mode

For development, set `XENDIT_MODE=simulate` to test without real API calls:

```typescript
import { isSimulationMode } from '@/lib/xendit';

if (isSimulationMode()) {
  // Returns mock invoice without API call
  // Webhook verification always succeeds
}
```

## SDK Reference

The cloned SDK repository at `xendit-node/` contains:

- Source code and type definitions
- `/docs/` - API documentation
- `/invoice/` - Invoice API implementation
- `/payment_request/` - Payment request API
- `/payment_method/` - Payment method API

## Files Modified

| File | Purpose |
|------|---------|
| `src/lib/xendit.ts` | Core SDK integration |
| `src/app/api/webhooks/xendit/route.ts` | Webhook handler with SDK types |
| `src/app/checkout/actions.ts` | Checkout using SDK |
| `src/app/dashboard/billing/actions.ts` | Billing actions using SDK |
| `src/components/checkout/PaymentMethodSelector.tsx` | Payment method UI |

## API Documentation

- [Xendit API Reference](https://developers.xendit.co/api-reference/)
- [Invoice API](https://developers.xendit.co/api-reference/#invoices)
- [Webhook Callbacks](https://developers.xendit.co/api-reference/#callbacks)
- [Payment Channels](https://docs.xendit.co/payment-channels)
