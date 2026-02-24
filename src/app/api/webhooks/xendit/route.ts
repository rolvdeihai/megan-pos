// src/app/api/webhooks/xendit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, isSimulationMode } from '@/lib/xendit';
import {
  activateSubscription,
  expirePendingSubscription,
} from '@/lib/subscription';
import type { XenditWebhookPayload } from '@/lib/xendit';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = await request.text();
    const signature = request.headers.get('x-callback-token') || '';

    // Verify webhook signature (skip in simulation mode)
    if (!isSimulationMode() && !verifyWebhookSignature(payload, signature)) {
      console.warn('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const data: XenditWebhookPayload = JSON.parse(payload);

    console.log('Xendit webhook received:', {
      external_id: data.external_id,
      status: data.status,
      payment_method: data.payment_method,
    });

    // Handle based on status
    switch (data.status) {
      case 'PAID': {
        await activateSubscription(data.external_id, {
          xendit_invoice_id: data.id,
          payment_method: data.payment_method,
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
      default: {
        // No action needed for pending
        console.log('Payment pending:', data.external_id);
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
