alter table public.orders
  add column if not exists out_trade_no text,
  add column if not exists paid_at timestamptz,
  add column if not exists transaction_id text;

create unique index if not exists orders_out_trade_no_key
  on public.orders (out_trade_no)
  where out_trade_no is not null;

create unique index if not exists user_courses_user_id_course_id_key
  on public.user_courses (user_id, course_id);

