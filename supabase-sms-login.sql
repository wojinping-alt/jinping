create table if not exists public.sms_login_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists sms_login_codes_phone_created_at_idx
  on public.sms_login_codes (phone, created_at desc);

create index if not exists sms_login_codes_phone_code_hash_idx
  on public.sms_login_codes (phone, code_hash);

