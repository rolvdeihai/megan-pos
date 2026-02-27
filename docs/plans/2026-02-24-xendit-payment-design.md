# Xendit Payment Integration Design

**Date:** 2026-02-24
**Feature:** Real subscription/plan upgrade functionality using Xendit payment gateway
**Status:** Approved for implementation

---

## Overview

Replace the simulated payment flow on the Billing page with real payment processing using Xendit's Invoice API. Support Indonesian payment methods: Virtual Account (BCA, BNI, Mandiri), QRIS, and e-wallets (DANA, OVO, LinkAja).

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Billing Page   │────▶│  Server Action   │────▶│  Xendit Invoice │
│  (React Client) │     │  createInvoice() │     │  API (REST)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                        │
                              ┌────────────────────────┘
                              ▼
                       ┌─────────────────┐
                       │ Xendit Hosted   │
                       │ Payment Page    │
                       │ (VA/QRIS/E-wallet)
                       └─────────────────┘
                              │
        ┌─────────────────────┘
        ▼
┌─────────────────┐     ┌──────────────────┐
│  Webhook Handler│────▶│  Update Database │
│  /api/webhooks/ │     │  (subscription)  │
│    xendit       │     └──────────────────┘
└─────────────────┘              │
                                 ▼
                          ┌─────────────────┐
                          │  User redirected│
                          │  to billing page│
                          │  with success   │
                          └─────────────────┘
```

---

## Data Flow

### 1. Initiate Payment

When user clicks "Lanjut & Bayar":

```typescript
// Server Action: createXenditInvoice(packageId: string)
1. Validate user authentication
2. Check if user already has selected package → return error
3. Create pending subscription record (status: 'pending_payment')
4. Call Xendit Invoice API:
   - external_id: subscription_id
   - amount: package.price
   - currency: "IDR"
   - payment_methods: ["BCA", "BNI", "MANDIRI", "QRIS", "DANA", "OVO", "LINKAJA"]
   - success_redirect_url: "/dashboard/billing?status=success&order_id={id}"
   - failure_redirect_url: "/dashboard/billing?status=failed&order_id={id}"
   - callback_url: "{BASE_URL}/api/webhooks/xendit"
5. Return invoice_url to client
6. Client redirects user to Xendit payment page
```

### 2. Payment Processing

User selects and completes payment on Xendit-hosted page:
- Virtual Account: Display account number, user transfers
- QRIS: Display QR code, user scans
- E-wallet: Redirect to wallet app, authorize payment

### 3. Webhook Notification

Xendit sends POST request to our webhook endpoint:

```typescript
// API Route: POST /api/webhooks/xendit
1. Verify webhook signature (XENDIT_WEBHOOK_SECRET)
2. Parse invoice payload
3. Find subscription by external_id
4. If status === "PAID":
   - Update subscription: status → 'active'
   - Update users.subscription_tier
   - Set subscription_end_date = now + 30 days
   - Store payment details (payment_method, paid_at, xendit_invoice_id)
5. Return 200 OK to acknowledge receipt
```

### 4. User Return

User automatically redirected back to billing page:
- Success: `?status=success&order_id=xxx` → Show success toast, refresh subscription
- Failed: `?status=failed&order_id=xxx` → Show error toast, allow retry

---

## File Structure

### New Files

```
src/
├── lib/
│   ├── xendit.ts              # Xendit API client, types, signature verification
│   └── subscription.ts        # Shared subscription operations (validate, update)
├── app/
│   ├── api/
│   │   └── webhooks/
│   │       └── xendit/
│   │           └── route.ts   # POST handler for Xendit webhooks
│   └── dashboard/
│       └── billing/
│           └── actions.ts     # Server actions for payment flow
```

### Modified Files

```
src/
├── app/
│   └── dashboard/
│       └── billing/
│           └── page.tsx       # Add query param handling, loading states, simulation UI
├── .env.local                 # Add XENDIT_API_KEY, XENDIT_WEBHOOK_SECRET, XENDIT_MODE
```

---

## Database Schema

Existing tables used (no schema changes required):

**`users`**
- `subscription_tier: string` (basic/pro/enterprise)
- `subscription_end_date: timestamp`

**`user_subscriptions`**
- `user_id`, `package_id`, `status` (pending_payment/active/expired)
- `start_date`, `end_date`
- `payment_proof_url` → reuse for xendit_invoice_id reference

**`packages`**
- `id`, `name`, `price`, `duration_days` (30), `features`

---

## Security Considerations

1. **Webhook Signature Verification**
   - All webhook requests verified using XENDIT_WEBHOOK_SECRET
   - Reject requests with invalid signatures (401 Unauthorized)

2. **API Key Protection**
   - XENDIT_API_KEY only in server-side code (Server Actions, API routes)
   - Never exposed to client

3. **Idempotency**
   - external_id (subscription_id) prevents duplicate processing
   - Check subscription status before updating (don't re-activate already active)

4. **Input Validation**
   - Validate packageId against packages table
   - Verify user owns the subscription being updated

---

## Development/Simulation Mode

Since Xendit API keys are not yet available, implement simulation mode:

```
XENDIT_MODE=simulate
```

**Behavior in simulate mode:**
- `createInvoice()` returns mock invoice_url: `#simulate-payment`
- Billing page detects mock URL, shows simulation UI:
  - "Simulate: Payment Success" button → triggers webhook handler directly
  - "Simulate: Payment Failed" button → tests failure path
- Webhook handler can be called directly for testing

This allows full flow development and testing without real API calls.

---

## Error Handling

| Scenario | User Experience | System Behavior |
|----------|----------------|-----------------|
| Already on selected plan | Disable button, show "Paket Aktif" | Early return, no API call |
| Xendit API error | Toast: "Gagal membuat invoice. Coba lagi." | Log error, allow retry |
| Payment expired | Toast: "Pembayaran expired. Silakan ulangi." | Subscription stays pending, allow new invoice |
| Payment failed | Toast: "Pembayaran gagal. Silakan coba metode lain." | Keep pending, user can retry |
| Webhook signature invalid | 401 response to Xendit | Log security warning |
| Duplicate webhook | 200 OK, no action | Idempotent processing |

---

## Environment Variables

```bash
# Xendit Configuration
XENDIT_API_KEY=xnd_development_...          # Secret API key
XENDIT_WEBHOOK_SECRET=whsec_...             # For signature verification
XENDIT_MODE=live|simulate                   # Development toggle

# Existing (already present)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## Future Enhancements (Out of Scope)

- Automatic renewal/subscription management
- Payment history page
- Invoice PDF download
- Partial refunds handling
- Multiple subscription periods (quarterly/yearly)
- Promo codes and discounts

---

## Approval

Design approved for implementation on 2026-02-24.
