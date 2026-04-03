// src/lib/subscription.ts
import { supabase } from './supabase';
import type { Database } from './database.types';

type Subscription = Database['public']['Tables']['user_subscriptions']['Row'];
type Package = Database['public']['Tables']['packages']['Row'];

export interface SubscriptionValidationResult {
  valid: boolean;
  error?: string;
  currentSubscription?: Subscription;
  targetPackage?: Package;
}

export async function validateSubscriptionChange(
  userId: string,
  packageId: string
): Promise<SubscriptionValidationResult> {
  // Check if already on this plan
  const { data: currentSub } = await supabase
    .from('user_subscriptions')
    .select('*, packages(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (currentSub?.package_id === packageId) {
    return {
      valid: false,
      error: 'Anda sudah berada di paket ini',
      currentSubscription: currentSub,
    };
  }

  // Validate package exists
  const { data: pkg } = await supabase
    .from('packages')
    .select('*')
    .eq('id', packageId)
    .single();

  if (!pkg) {
    return {
      valid: false,
      error: 'Paket tidak ditemukan',
    };
  }

  return {
    valid: true,
    currentSubscription: currentSub || undefined,
    targetPackage: pkg,
  };
}

export async function createPendingSubscription(
  userId: string,
  packageId: string
): Promise<Subscription> {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  const { data, error } = await supabase
    .from('user_subscriptions')
    .insert({
      user_id: userId,
      package_id: packageId,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      status: 'pending_payment',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create subscription: ${error.message}`);
  }

  return data;
}

export async function activateSubscription(
  subscriptionId: string,
  paymentDetails: {
    payment_proof_url: string; // Generic payment proof (xendit_invoice_id, midtrans_transaction_id, etc.)
    payment_method?: string;
    paid_at?: string;
  }
): Promise<void> {
  // Get subscription with package info
  const { data: subscription, error: subError } = await supabase
    .from('user_subscriptions')
    .select('*, packages(*)')
    .eq('id', subscriptionId)
    .single();

  if (subError || !subscription) {
    throw new Error('Subscription not found');
  }

  // Idempotency: check if already active
  if (subscription.status === 'active') {
    return;
  }

  const now = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + (subscription.packages?.duration_days || 30));

  // Update subscription
  const { error: updateError } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'active',
      start_date: now.toISOString(),
      end_date: endDate.toISOString(),
      payment_proof_url: paymentDetails.payment_proof_url,
    })
    .eq('id', subscriptionId);

  if (updateError) {
    throw new Error(`Failed to activate subscription: ${updateError.message}`);
  }

  // Update user tier
  const { error: userError } = await supabase
    .from('users')
    .update({
      subscription_tier: subscription.package_id,
      subscription_end_date: endDate.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', subscription.user_id);

  if (userError) {
    throw new Error(`Failed to update user: ${userError.message}`);
  }
}

export async function expirePendingSubscription(subscriptionId: string): Promise<void> {
  const { error } = await supabase
    .from('user_subscriptions')
    .update({ status: 'expired' })
    .eq('id', subscriptionId)
    .eq('status', 'pending_payment');

  if (error) {
    throw new Error(`Failed to expire subscription: ${error.message}`);
  }
}
