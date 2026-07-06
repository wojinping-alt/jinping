create table if not exists public.product_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product_key text not null,
  product_title text not null,
  product_type text not null,
  quantity integer not null default 1 check (quantity > 0),
  amount numeric(10, 2) not null check (amount > 0),
  status text not null default 'pending',
  out_trade_no text,
  transaction_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists product_orders_out_trade_no_key
  on public.product_orders (out_trade_no)
  where out_trade_no is not null;

create index if not exists product_orders_user_id_created_at_idx
  on public.product_orders (user_id, created_at desc);
