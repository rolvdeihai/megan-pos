import { supabaseAdmin } from './supabase-admin';

interface PaymentDetails {
  payment_proof_url: string;
  payment_gateway?: string;
  payment_method?: string;
  payment_channel?: string;
  paid_at?: string;
  gateway_status?: string;
}

interface ExpirationPaymentDetails {
  payment_proof_url?: string;
  payment_gateway?: string;
  payment_method?: string;
  payment_channel?: string;
  paid_at?: string;
  gateway_status?: string;
}

export async function activateSubscriptionAdmin(
  subscriptionId: string,
  paymentDetails: PaymentDetails
): Promise<void> {
  const { data: subscription, error: subError } = await supabaseAdmin
    .from('user_subscriptions')
    .select('*, packages(*)')
    .eq('id', subscriptionId)
    .single();

  if (subError || !subscription) {
    throw new Error('Subscription not found');
  }

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

export async function expirePendingSubscriptionAdmin(
  subscriptionId: string,
  paymentDetails?: ExpirationPaymentDetails
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
