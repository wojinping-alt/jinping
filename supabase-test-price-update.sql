-- Temporary low prices for WeChat Pay testing.
-- Run this in Supabase SQL Editor before testing purchases.

update public.courses
set price = 0.01
where id in (101, 102);
