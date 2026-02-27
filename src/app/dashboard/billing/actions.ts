// src/app/dashboard/billing/actions.ts
// Xendit SDK Billing Actions

'use server';

import { createXenditInvoice, isSimulationMode } from '@/lib/xendit';
import type { Invoice } from '@/lib/xendit';
import {
  validateSubscriptionChange,
  createPendingSubscription,
} from '@/lib/subscription';

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

    // Create Xendit invoice using SDK
    // Docs: https://developers.xendit.co/api-reference/#create-invoice
    const invoice: Invoice = await createXenditInvoice({
      external_id: subscription.id,
      amount: validation.targetPackage.price,
      description: `Berlangganan ${validation.targetPackage.name} - Megan POS`,
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

export interface SimulationResult {
  success: boolean;
  error?: string;
}

export async function simulatePaymentSuccess(
  subscriptionId: string
): Promise<SimulationResult> {
  if (!isSimulationMode()) {
    return {
      success: false,
      error: 'Mode simulasi tidak aktif',
    };
  }

  try {
    // Directly call the webhook handler logic
    const { activateSubscription } = await import('@/lib/subscription');

    await activateSubscription(subscriptionId, {
      xendit_invoice_id: `sim_invoice_${Date.now()}`,
      payment_method: 'SIMULATED',
      paid_at: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error('Simulation error:', error);
    return {
      success: false,
      error: 'Simulasi gagal',
    };
  }
}

export async function simulatePaymentFailure(
  subscriptionId: string
): Promise<SimulationResult> {
  if (!isSimulationMode()) {
    return {
      success: false,
      error: 'Mode simulasi tidak aktif',
    };
  }

  try {
    const { expirePendingSubscription } = await import('@/lib/subscription');
    await expirePendingSubscription(subscriptionId);
    return { success: true };
  } catch (error) {
    console.error('Simulation error:', error);
    return {
      success: false,
      error: 'Simulasi gagal',
    };
  }
}
