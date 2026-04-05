// src/app/api/webhooks/midtrans/route.ts
// Midtrans webhook handler
// Docs: https://docs.midtrans.com/en/after-payment/http-notification

import { NextRequest, NextResponse } from 'next/server';
import { verifyMidtransWebhook, parseMidtransWebhook } from '@/lib/gateways/midtrans-adapter';
import { isSimulationMode } from '@/lib/payment-gateway';
import {
  activateSubscription,
  expirePendingSubscription,
} from '@/lib/subscription';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = await request.text();
    
    // Midtrans sends signature in x-signature-key header for Snap notifications
    // Or it can be passed as signature field in the JSON body
    // Docs: https://docs.midtrans.com/en/after-payment/http-notification
    let signature = request.headers.get('x-signature-key') || '';
    
    try {
      const parsed = JSON.parse(payload);
      // If no header signature, check body signature field
      if (!signature && parsed.signature_key) {
        signature = parsed.signature_key;
      }
    } catch (e) {
      // Ignore parse error, signature might come from header
    }

    // Verify webhook signature in production
    if (!isSimulationMode() && signature) {
      if (!verifyMidtransWebhook(payload, signature)) {
        console.warn('Invalid Midtrans webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Parse notification
    const notification = JSON.parse(payload);
    const data = parseMidtransWebhook(notification);

    console.log('Midtrans webhook received:', {
      external_id: data.external_id,
      status: data.status,
      payment_method: data.payment_method,
      gateway_id: data.gateway_id,
    });

    // Handle based on status
    // Midtrans uses: capture, settlement, pending, deny, cancel, expire
    switch (data.status) {
      case 'PAID': {
        await activateSubscription(data.external_id, {
          payment_proof_url: data.gateway_id,
          payment_method: data.payment_method || 'UNKNOWN',
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

      case 'FAILED': {
        // Cancel/deny - expire the subscription
        await expirePendingSubscription(data.external_id);
        console.log('Subscription failed:', data.external_id);
        break;
      }

      case 'PENDING':
      default: {
        console.log('Payment pending:', data.external_id);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Midtrans webhook error:', error);
    // Return 200 to prevent Midtrans retries for unrecoverable errors
    return NextResponse.json({ received: true, error: 'Processing failed' });
  }
}
