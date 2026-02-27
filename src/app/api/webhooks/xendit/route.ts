// src/app/api/webhooks/xendit/route.ts
// Xendit webhook handler using official SDK types
// Docs: https://developers.xendit.co/api-reference/#invoice-callback

import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, isSimulationMode, parseWebhookPayload } from '@/lib/xendit';
import type { InvoiceCallback } from '@/lib/xendit';
import {
  activateSubscription,
  expirePendingSubscription,
} from '@/lib/subscription';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = await request.text();
    const signature = request.headers.get('x-callback-token') || '';

    // Verify webhook signature (skip in simulation mode)
    if (!isSimulationMode() && !verifyWebhookSignature(payload, signature)) {
      console.warn('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse payload using SDK-compatible types
    const data: InvoiceCallback = parseWebhookPayload(payload);

    console.log('Xendit webhook received:', {
      external_id: data.externalId,
      status: data.status,
      payment_method: data.paymentMethod,
      payment_channel: data.paymentChannel,
    });

    // Handle based on status
    // Docs: https://developers.xendit.co/api-reference/#invoice-status
    switch (data.status) {
      case 'PAID': {
        await activateSubscription(data.externalId, {
          xendit_invoice_id: data.id,
          payment_method: data.paymentMethod || data.paymentChannel || 'UNKNOWN',
          paid_at: data.paidAt,
        });
        console.log('Subscription activated:', data.externalId);
        break;
      }

      case 'EXPIRED': {
        await expirePendingSubscription(data.externalId);
        console.log('Subscription expired:', data.externalId);
        break;
      }

      case 'PENDING':
      default: {
        // No action needed for pending
        console.log('Payment pending:', data.externalId);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    // Return 200 to prevent Xendit retries for unrecoverable errors
    // Log error for monitoring instead
    return NextResponse.json({ received: true, error: 'Processing failed' });
  }
}
