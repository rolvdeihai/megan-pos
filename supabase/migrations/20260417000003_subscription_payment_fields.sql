-- =============================================================================
-- Migration: 20260417000003_subscription_payment_fields.sql
-- Description: Add payment audit fields to user_subscriptions for gateway reconciliation
-- =============================================================================

alter table public.user_subscriptions
  add column if not exists payment_gateway text,
  add column if not exists payment_method text,
  add column if not exists payment_channel text,
  add column if not exists paid_at timestamptz,
  add column if not exists gateway_transaction_id text,
  add column if not exists last_gateway_status text,
  add column if not exists webhook_received_at timestamptz;

create index if not exists idx_user_subscriptions_payment_gateway
  on public.user_subscriptions(payment_gateway);

create index if not exists idx_user_subscriptions_gateway_transaction_id
  on public.user_subscriptions(gateway_transaction_id);

create index if not exists idx_user_subscriptions_last_gateway_status
  on public.user_subscriptions(last_gateway_status);
