-- ─────────────────────────────────────────────────────────────
-- PWA Push Subscriptions Schema
-- Chạy trong Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────

-- 1. Bảng lưu Web Push subscriptions của từng user
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Mỗi user chỉ có 1 subscription per endpoint (thiết bị)
  unique (user_id, endpoint)
);

-- 2. Index để query nhanh theo user_id
create index if not exists push_subscriptions_user_id_idx
  on push_subscriptions(user_id);

-- 3. RLS Policies
alter table push_subscriptions enable row level security;

-- User chỉ được đọc/ghi subscription của chính mình
create policy "Users can manage own push subscriptions"
  on push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Edge Function (service role) được đọc tất cả để gửi push
create policy "Service role can read all subscriptions"
  on push_subscriptions
  for select
  using (auth.role() = 'service_role');

-- 4. Trigger tự cập nhật updated_at
create or replace function update_push_subscriptions_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger push_subscriptions_updated_at
  before update on push_subscriptions
  for each row execute function update_push_subscriptions_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 5. Webhook để kích hoạt Edge Function khi có notification mới
-- Cấu hình trong Supabase Dashboard:
--   Database > Webhooks > Create webhook
--   Table: notifications
--   Events: INSERT
--   HTTP URL: https://<project-ref>.supabase.co/functions/v1/send-push
--   HTTP Headers: Authorization: Bearer <SERVICE_ROLE_KEY>
-- ─────────────────────────────────────────────────────────────
