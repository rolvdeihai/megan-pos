-- Fix Transactions Table RLS and add auto-insert trigger

-- Enable RLS on transactions table
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;

-- Create policies for transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own transactions" ON public.transactions
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own transactions" ON public.transactions
  FOR DELETE
  USING (user_id = auth.uid());

-- Function to auto-create transaction when order is paid
CREATE OR REPLACE FUNCTION create_transaction_on_order_paid()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create transaction if payment_status changed to 'paid' and no transaction exists
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    -- Check if transaction already exists for this order
    IF NOT EXISTS (
      SELECT 1 FROM public.transactions 
      WHERE order_id = NEW.id AND type = 'sale'
    ) THEN
      INSERT INTO public.transactions (
        user_id,
        order_id,
        transaction_number,
        type,
        amount,
        payment_method,
        status,
        notes
      ) VALUES (
        NEW.user_id,
        NEW.id,
        'TRX-' || EXTRACT(EPOCH FROM NOW())::bigint % 1000000,
        'sale',
        NEW.total_amount,
        COALESCE(NEW.payment_method, 'cash'),
        'completed',
        'Pembayaran untuk order ' || NEW.order_number
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS order_paid_create_transaction ON public.orders;

-- Create trigger
CREATE TRIGGER order_paid_create_transaction
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION create_transaction_on_order_paid();

-- Also create trigger for INSERT (when order is created as already paid)
CREATE OR REPLACE FUNCTION create_transaction_on_order_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Create transaction if order is inserted as paid
  IF NEW.payment_status = 'paid' THEN
    INSERT INTO public.transactions (
      user_id,
      order_id,
      transaction_number,
      type,
      amount,
      payment_method,
      status,
      notes
    ) VALUES (
      NEW.user_id,
      NEW.id,
      'TRX-' || EXTRACT(EPOCH FROM NOW())::bigint % 1000000,
      'sale',
      NEW.total_amount,
      COALESCE(NEW.payment_method, 'cash'),
      'completed',
      'Pembayaran untuk order ' || NEW.order_number
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS order_insert_create_transaction ON public.orders;

-- Create trigger for insert
CREATE TRIGGER order_insert_create_transaction
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION create_transaction_on_order_insert();

-- Enable realtime for transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
