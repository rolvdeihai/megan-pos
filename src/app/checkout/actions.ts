'use server';

// Xendit SDK Checkout Actions
// Uses official xendit-node SDK for standardized payment processing

import { createXenditInvoice, isSimulationMode } from '@/lib/xendit';
import type { Invoice } from '@/lib/xendit';
import {
  validateSubscriptionChange,
  createPendingSubscription,
} from '@/lib/subscription';

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
  simulation?: boolean;
  error?: string;
}

export async function initiateCheckout(params: CheckoutParams): Promise<CheckoutResult> {
  try {
    const { userId, packageId, paymentMethod, userEmail, userName } = params;

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

    // Handle simulation mode
    if (isSimulationMode()) {
      return {
        success: true,
        invoiceId: `sim_${subscription.id}`,
        subscriptionId: subscription.id,
        simulation: true,
      };
    }

    // Create Xendit invoice with SDK
    // Docs: https://developers.xendit.co/api-reference/#create-invoice
    const invoice: Invoice = await createXenditInvoice({
      external_id: subscription.id,
      amount: validation.targetPackage.price,
      description: `Berlangganan ${validation.targetPackage.name} - Megan POS`,
      payment_methods: [paymentMethod],
      success_redirect_url: `${BASE_URL}/dashboard/billing?status=success&order_id=${subscription.id}`,
      failure_redirect_url: `${BASE_URL}/dashboard/billing?status=failed&order_id=${subscription.id}`,
      callback_url: `${BASE_URL}/api/webhooks/xendit`,
      currency: 'IDR',
      invoice_duration: 86400, // 24 hours
      customer: {
        given_names: userName,
        email: userEmail,
      },
    });

    return {
      success: true,
      invoiceId: invoice.id,
      subscriptionId: subscription.id,
      invoiceUrl: invoice.invoiceUrl,
    };
  } catch (error) {
    console.error('Checkout error:', error);
    return {
      success: false,
      error: 'Gagal memproses pembayaran. Silakan coba lagi.',
    };
  }
}
