create table if not exists public.wechat_login_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  wechat_user_id text,
  nickname text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists wechat_login_codes_code_idx
  on public.wechat_login_codes (code);

create index if not exists wechat_login_codes_expires_at_idx
  on public.wechat_login_codes (expires_at);

