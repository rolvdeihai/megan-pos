'use server';

// Payment Gateway Checkout Actions
// Supports multiple payment gateways: simulate, xendit, midtrans

import {
  createInvoice,
  getPaymentGateway,
} from '@/lib/payment-gateway';
import {
  validateSubscriptionChange,
  createPendingSubscription,
} from '@/lib/subscription';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function getPackage(packageId: string) {
  const { data, error } = await supabaseAdmin
    .from('packages')
    .select('*')
    .eq('id', packageId)
    .maybeSingle();

  if (error) {
    console.error('[getPackage] Supabase error:', error.message);
    return { error: error.message };
  }
  if (!data) {
    console.error('[getPackage] Package not found:', packageId);
    return { error: 'Paket tidak ditemukan' };
  }
  return { data };
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

interface CheckoutParams {
  userId: string;
  packageId: string;
  paymentMethod: string;
  userEmail: string;
  userName: string;
}

interface CheckoutResult {
  success: boolean;
  invoiceId?: string;
  subscriptionId?: string;
  invoiceUrl?: string;
  error?: string;
}

export async function initiateCheckout(params: CheckoutParams): Promise<CheckoutResult> {
  try {
    const { userId, packageId, paymentMethod, userEmail, userName } = params;
    console.log('[initiateCheckout] Starting:', { userId, packageId, paymentMethod });

    // Validate subscription change
    const validation = await validateSubscriptionChange(userId, packageId);
    console.log('[initiateCheckout] Validation result:', { valid: validation.valid, error: validation.error });

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
    console.log('[initiateCheckout] Creating pending subscription...');
    const subscription = await createPendingSubscription(userId, packageId);
    console.log('[initiateCheckout] Subscription created:', subscription.id);

    // Create payment invoice via abstraction layer
    const gateway = getPaymentGateway();
    const webhookPath = gateway === 'midtrans' ? '/api/webhooks/midtrans' : '/api/webhooks/xendit';

    console.log('[initiateCheckout] Creating invoice via gateway:', gateway);
    const invoice = await createInvoice({
      external_id: subscription.id,
      amount: validation.targetPackage.price,
      description: `Berlangganan ${validation.targetPackage.name} - JetNote Pos`,
      payment_methods: [paymentMethod],
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

    console.log('[initiateCheckout] Invoice created:', { id: invoice.id, invoiceUrl: invoice.invoiceUrl });

    return {
      success: true,
      invoiceId: invoice.id,
      subscriptionId: subscription.id,
      invoiceUrl: invoice.invoiceUrl,
    };
  } catch (error: any) {
    console.error('[initiateCheckout] Error:', error?.message || error);
    return {
      success: false,
      error: 'Gagal memproses pembayaran. Silakan coba lagi.',
    };
  }
}
