// src/app/api/webhooks/midtrans/route.ts
// Midtrans webhook handler
// Docs: https://docs.midtrans.com/en/after-payment/http-notification

import { NextRequest, NextResponse } from 'next/server';
import { verifyMidtransWebhook, parseMidtransWebhook } from '@/lib/gateways/midtrans-adapter';
import { isSimulationMode } from '@/lib/payment-gateway';
import {
  activateSubscriptionAdmin,
  expirePendingSubscriptionAdmin,
} from '@/lib/subscription-admin';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = await request.text();
    const simulationMode = isSimulationMode();
    
    // Midtrans sends signature_key in the JSON body for Snap notifications
    // Docs: https://docs.midtrans.com/en/after-payment/http-notification
    let signature = '';
    let notification: Record<string, any>;

    try {
      notification = JSON.parse(payload);
      // Snap notifications include signature_key in body
      if (notification.signature_key) {
        signature = notification.signature_key;
      }
    } catch {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (!simulationMode && !signature) {
      console.warn('Missing Midtrans webhook signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    if (!simulationMode) {
      if (!verifyMidtransWebhook(payload, signature)) {
        console.warn('Invalid Midtrans webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Parse notification
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
        await activateSubscriptionAdmin(data.external_id, {
          payment_proof_url: data.gateway_id,
          payment_gateway: 'midtrans',
          payment_method: data.payment_method || 'UNKNOWN',
          payment_channel: data.payment_channel,
          paid_at: data.paid_at,
          gateway_status: data.status,
        });
        console.log('Subscription activated:', data.external_id);
        break;
      }

      case 'EXPIRED': {
        await expirePendingSubscriptionAdmin(data.external_id, {
          payment_proof_url: data.gateway_id,
          payment_gateway: 'midtrans',
          payment_method: data.payment_method,
          payment_channel: data.payment_channel,
          paid_at: data.paid_at,
          gateway_status: data.status,
        });
        console.log('Subscription expired:', data.external_id);
        break;
      }

      case 'FAILED': {
        // Cancel/deny - expire the subscription
        await expirePendingSubscriptionAdmin(data.external_id, {
          payment_proof_url: data.gateway_id,
          payment_gateway: 'midtrans',
          payment_method: data.payment_method,
          payment_channel: data.payment_channel,
          paid_at: data.paid_at,
          gateway_status: data.status,
        });
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
