// src/app/dashboard/billing/actions.ts
// Payment Gateway Billing Actions

'use server';

import {
  createInvoice,
  getPaymentGateway,
} from '@/lib/payment-gateway';
import {
  validateSubscriptionChange,
  createPendingSubscription,
} from '@/lib/subscription';
import { supabaseAdmin } from '@/lib/supabase-admin';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export interface CreateInvoiceResult {
  success: boolean;
  invoiceUrl?: string;
  error?: string;
  subscriptionId?: string;
}

export async function createPaymentInvoice(
  userId: string,
  packageId: string,
  userEmail: string,
  userName: string
): Promise<CreateInvoiceResult> {
  try {
    // Validate subscription change
    const validation = await validateSubscriptionChange(userId, packageId);

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    if (!validation.targetPackage) {
      return {
        success: false,
        error: 'Paket tidak ditemukan',
      };
    }

    // Create pending subscription
    const subscription = await createPendingSubscription(userId, packageId);

    // Create payment invoice via abstraction layer
    const gateway = getPaymentGateway();
    const webhookPath = gateway === 'midtrans' ? '/api/webhooks/midtrans' : '/api/webhooks/xendit';

    const invoice = await createInvoice({
      external_id: subscription.id,
      amount: validation.targetPackage.price,
      description: `Berlangganan ${validation.targetPackage.name} - Megan POS`,
      success_redirect_url: `${BASE_URL}/payment/callback?status=success&order_id=${subscription.id}`,
      failure_redirect_url: `${BASE_URL}/payment/callback?status=failed&order_id=${subscription.id}`,
      callback_url: `${BASE_URL}${webhookPath}`,
      currency: 'IDR',
      invoice_duration: 86400, // 24 hours
      customer: {
        given_names: userName,
        email: userEmail,
      },
    });

    return {
      success: true,
      invoiceUrl: invoice.invoiceUrl,
      subscriptionId: subscription.id,
    };
  } catch (error) {
    console.error('Error creating invoice:', error);
    return {
      success: false,
      error: 'Gagal membuat invoice. Silakan coba lagi.',
    };
  }
}

export async function getCurrentSubscription(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_subscriptions')
    .select('*, packages(id, name, price, features)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('[getCurrentSubscription] Error:', error.message);
    return { error: error.message };
  }
  return { data };
}

export async function getSubscriptionById(subscriptionId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_subscriptions')
    .select('id, status, package_id')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (error) {
    console.error('[getSubscriptionById] Error:', error.message);
    return { error: error.message };
  }
  return { data };
}
