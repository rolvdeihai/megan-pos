-- =============================================================================
-- Migration: 20260417000001_functions.sql
-- Description: Create all functions and triggers
-- Source: Remote Supabase database (csftinoyjdbnkupnwdig)
-- =============================================================================

-- Updated at column trigger function
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

comment on function public.update_updated_at_column() is 'Automatically updates the updated_at column on row update';

-- OTPs updated at trigger function
create or replace function public.update_otps_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- Check table overlap (prevent double-booking)
create or replace function public.check_table_overlap()
returns trigger
language plpgsql
as $$
declare
  conflict_count integer;
  before_time timestamptz;
  after_time timestamptz;
begin
  if new.order_type = 'dine_in' and new.table_id is not null and new.scheduled_time is not null then
    before_time := new.scheduled_time - interval '45 minutes';
    after_time  := new.scheduled_time + interval '45 minutes';

    select count(*)
    into conflict_count
    from orders
    where user_id = new.user_id
      and table_id = new.table_id
      and status not in ('completed', 'cancelled')
      and scheduled_time >= before_time
      and scheduled_time <= after_time
      and (tg_op = 'INSERT' or id != new.id);

    if conflict_count > 0 then
      raise exception 'Meja sudah dipesan pada waktu tersebut. Pilih waktu lain atau meja lain.';
    end if;
  end if;

  return new;
end;
$$;

-- Complete order transaction (atomic)
create or replace function public.complete_order_transaction(p_order_id uuid, p_payment_method text, p_user_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_order record;
  v_table_id uuid;
  v_transaction_number text;
  v_existing_tx uuid;
begin
  -- Check if transaction already exists (idempotency)
  select id into v_existing_tx
  from transactions
  where order_id = p_order_id
  limit 1;

  if v_existing_tx is not null then
    return jsonb_build_object('success', true, 'already_completed', true, 'message', 'Transaksi sudah ada');
  end if;

  -- Lock order row for update to prevent race condition
  select * into v_order
  from orders
  where id = p_order_id
  for update;

  if v_order is null then
    return jsonb_build_object('success', false, 'error', 'Order tidak ditemukan');
  end if;

  -- Check if already completed
  if v_order.status = 'completed' then
    if v_order.table_id is not null then
      update restaurant_tables
      set is_available = true
      where id = v_order.table_id and is_available = false;
    end if;

    return jsonb_build_object('success', true, 'already_completed', true, 'message', 'Order sudah complete');
  end if;

  -- Check if transaction already exists but order not completed (orphan transaction)
  select transaction_number into v_transaction_number
  from transactions
  where order_id = p_order_id
  limit 1;

  if v_transaction_number is not null then
    update orders set
      status = 'completed',
      payment_status = 'paid',
      completed_at = now()
    where id = p_order_id;

    if v_table_id is not null then
      update restaurant_tables
      set is_available = true
      where id = v_table_id;
    end if;

    return jsonb_build_object('success', true, 'message', 'Order completed (existing transaction)', 'transaction_number', v_transaction_number);
  end if;

  v_table_id := v_order.table_id;

  -- Generate transaction number
  v_transaction_number := 'TRX-' || v_order.order_number || '-' || extract(epoch from now())::bigint % 10000;

  -- Update order status
  update orders set
    status = 'completed',
    payment_status = 'paid',
    completed_at = now()
  where id = p_order_id;

  -- Create transaction record
  begin
    insert into transactions (
      user_id, order_id, transaction_number, type, amount,
      payment_method, status, notes, created_at
    ) values (
      p_user_id, p_order_id, v_transaction_number, 'sale', v_order.total_amount,
      coalesce(p_payment_method, 'cash'), 'completed',
      'Pembayaran untuk order ' || v_order.order_number, now()
    );
  exception when unique_violation then
    v_transaction_number := 'TRX-' || v_order.order_number || '-' || replace(gen_random_uuid()::text, '-', '')::text;

    insert into transactions (
      user_id, order_id, transaction_number, type, amount,
      payment_method, status, notes, created_at
    ) values (
      p_user_id, p_order_id, v_transaction_number, 'sale', v_order.total_amount,
      coalesce(p_payment_method, 'cash'), 'completed',
      'Pembayaran untuk order ' || v_order.order_number, now()
    );
  end;

  -- Free table if dine-in
  if v_table_id is not null then
    update restaurant_tables
    set is_available = true
    where id = v_table_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'transaction_number', v_transaction_number,
    'message', 'Order berhasil diselesaikan'
  );

exception
  when unique_violation then
    return jsonb_build_object('success', true, 'already_completed', true, 'message', 'Transaksi sudah ada (duplicate detected)');
  when others then
    return jsonb_build_object('success', false, 'error', 'Transaction failed: ' || sqlerrm);
end;
$$;

comment on function public.complete_order_transaction(uuid, text, uuid) is 'Atomically complete order, create transaction, and free table';

-- Create payroll
create or replace function public.create_payroll(
  p_user_id uuid, p_employee_id uuid, p_period_start date, p_period_end date,
  p_basic_salary numeric default 0, p_deductions numeric default 0, p_net_salary numeric default 0
)
returns jsonb
language plpgsql security definer
as $$
declare
  v_result jsonb;
begin
  insert into public.payrolls (
    user_id, employee_id, period_start, period_end,
    basic_salary, deductions, net_salary, status
  ) values (
    p_user_id, p_employee_id, p_period_start, p_period_end,
    p_basic_salary, p_deductions, p_net_salary, 'draft'
  )
  returning to_jsonb(payrolls.*) into v_result;

  return v_result;
end;
$$;

-- Get payrolls
create or replace function public.get_payrolls(p_user_id uuid)
returns jsonb
language plpgsql security definer
as $$
declare
  v_result jsonb;
begin
  select jsonb_agg(to_jsonb(p.*) order by p.period_start desc)
  into v_result
  from public.payrolls p
  where p.user_id = p_user_id;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

-- Create transaction on order insert
create or replace function public.create_transaction_on_order_insert()
returns trigger
language plpgsql security definer
as $$
begin
  if new.payment_status = 'paid' then
    insert into public.transactions (
      user_id, order_id, transaction_number, type, amount,
      payment_method, status, notes
    ) values (
      new.user_id, new.id,
      'TRX-' || extract(epoch from now())::bigint % 1000000,
      'sale', new.total_amount,
      coalesce(new.payment_method, 'cash'), 'completed',
      'Pembayaran untuk order ' || new.order_number
    );
  end if;

  return new;
end;
$$;

-- Create transaction on order paid (update)
create or replace function public.create_transaction_on_order_paid()
returns trigger
language plpgsql security definer
as $$
begin
  if new.payment_status = 'paid' and old.payment_status != 'paid' then
    if not exists (
      select 1 from public.transactions
      where order_id = new.id and type = 'sale'
    ) then
      insert into public.transactions (
        user_id, order_id, transaction_number, type, amount,
        payment_method, status, notes
      ) values (
        new.user_id, new.id,
        'TRX-' || extract(epoch from now())::bigint % 1000000,
        'sale', new.total_amount,
        coalesce(new.payment_method, 'cash'), 'completed',
        'Pembayaran untuk order ' || new.order_number
      );
    end if;
  end if;

  return new;
end;
$$;

-- =============================================================================
-- Triggers
-- =============================================================================

-- Orders triggers
create trigger enforce_table_overlap
  before insert or update on public.orders
  for each row execute function public.check_table_overlap();

create trigger order_insert_create_transaction
  after insert on public.orders
  for each row execute function public.create_transaction_on_order_insert();

create trigger order_paid_create_transaction
  after update on public.orders
  for each row when (old.payment_status is distinct from new.payment_status)
  execute function public.create_transaction_on_order_paid();

create trigger update_orders_updated_at
  before update on public.orders
  for each row execute function public.update_updated_at_column();

-- OTPs trigger
create trigger update_otps_updated_at
  before update on public.otps
  for each row execute function public.update_otps_updated_at();

-- Restaurant tables trigger
create trigger update_restaurant_tables_updated_at
  before update on public.restaurant_tables
  for each row execute function public.update_updated_at_column();
