-- Add payment audit fields to user_subscriptions for gateway reconciliation

ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS payment_gateway TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_channel TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS gateway_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS last_gateway_status TEXT,
ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_payment_gateway
ON public.user_subscriptions(payment_gateway);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_gateway_transaction_id
ON public.user_subscriptions(gateway_transaction_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_last_gateway_status
ON public.user_subscriptions(last_gateway_status);
