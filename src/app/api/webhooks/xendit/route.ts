// src/app/api/webhooks/xendit/route.ts
// Xendit webhook handler using payment gateway abstraction
// Docs: https://developers.xendit.co/api-reference/#invoice-callback

import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, isSimulationMode, parseWebhookPayload } from '@/lib/payment-gateway';
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

    // Parse payload using abstraction layer
    const data = parseWebhookPayload(payload);

    console.log('Xendit webhook received:', {
      external_id: data.external_id,
      status: data.status,
      payment_method: data.payment_method,
      payment_channel: data.payment_channel,
    });

    // Handle based on status
    switch (data.status) {
      case 'PAID': {
        await activateSubscription(data.external_id, {
          payment_proof_url: data.gateway_id,
          payment_method: data.payment_method || data.payment_channel || 'UNKNOWN',
          paid_at: data.paid_at,
        });
        console.log('Subscription activated:', data.external_id);
        break;
      }

      case 'EXPIRED': {
        await expirePendingSubscription(data.external_id);
        console.log('Subscription expired:', data.external_id);
        break;
      }

      case 'PENDING':
      case 'FAILED':
      default: {
        console.log('Payment status:', data.status, data.external_id);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    // Return 200 to prevent retries for unrecoverable errors
    return NextResponse.json({ received: true, error: 'Processing failed' });
  }
}
