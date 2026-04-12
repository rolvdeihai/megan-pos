// src/lib/subscription.ts
import { supabaseAdmin } from './supabase-admin';
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
  const { data: currentSub } = await supabaseAdmin
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
  const { data: pkg } = await supabaseAdmin
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
  // Expire any stale pending_payment subscriptions for this user (older than 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  await supabaseAdmin
    .from('user_subscriptions')
    .update({ status: 'expired' })
    .eq('user_id', userId)
    .eq('status', 'pending_payment')
    .lt('created_at', oneHourAgo);

  // Check for existing recent pending subscription
  const { data: existingPending, error: existingPendingError } = await supabaseAdmin
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('package_id', packageId)
    .eq('status', 'pending_payment')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingPendingError) {
    throw new Error(`Failed to check pending subscription: ${existingPendingError.message}`);
  }

  if (existingPending) {
    return existingPending;
  }

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  const { data, error } = await supabaseAdmin
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
    payment_gateway?: string;
    payment_method?: string;
    payment_channel?: string;
    paid_at?: string;
    gateway_status?: string;
  }
): Promise<void> {
  // Get subscription with package info
  const { data: subscription, error: subError } = await supabaseAdmin
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

  // Expire other active subscriptions for this user (upgrade/downgrade)
  await supabaseAdmin
    .from('user_subscriptions')
    .update({ status: 'expired' })
    .eq('user_id', subscription.user_id)
    .eq('status', 'active')
    .neq('id', subscriptionId);

  const now = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + (subscription.packages?.duration_days || 30));

  // Update subscription
  const { error: updateError } = await supabaseAdmin
    .from('user_subscriptions')
    .update({
      status: 'active',
      start_date: now.toISOString(),
      end_date: endDate.toISOString(),
      payment_gateway: paymentDetails.payment_gateway || null,
      payment_method: paymentDetails.payment_method || null,
      payment_channel: paymentDetails.payment_channel || null,
      paid_at: paymentDetails.paid_at || now.toISOString(),
      gateway_transaction_id: paymentDetails.payment_proof_url,
      last_gateway_status: paymentDetails.gateway_status || 'PAID',
      payment_proof_url: paymentDetails.payment_proof_url,
      webhook_received_at: now.toISOString(),
    })
    .eq('id', subscriptionId);

  if (updateError) {
    throw new Error(`Failed to activate subscription: ${updateError.message}`);
  }

  // Update user tier
  const { error: userError } = await supabaseAdmin
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

export async function expirePendingSubscription(
  subscriptionId: string,
  paymentDetails?: {
    payment_proof_url?: string;
    payment_gateway?: string;
    payment_method?: string;
    payment_channel?: string;
    paid_at?: string;
    gateway_status?: string;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from('user_subscriptions')
    .update({
      status: 'expired',
      payment_gateway: paymentDetails?.payment_gateway || null,
      payment_method: paymentDetails?.payment_method || null,
      payment_channel: paymentDetails?.payment_channel || null,
      paid_at: paymentDetails?.paid_at || null,
      gateway_transaction_id: paymentDetails?.payment_proof_url || null,
      last_gateway_status: paymentDetails?.gateway_status || 'EXPIRED',
      payment_proof_url: paymentDetails?.payment_proof_url || null,
      webhook_received_at: now,
    })
    .eq('id', subscriptionId)
    .eq('status', 'pending_payment');

  if (error) {
    throw new Error(`Failed to expire subscription: ${error.message}`);
  }
}
