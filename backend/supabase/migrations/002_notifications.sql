-- Hestia notifications — a persistent, per-user in-app notification feed.
-- Run in the Supabase SQL editor or via the Supabase CLI after 001_init.sql.
--
-- Each row is one notification addressed to one recipient (user_id). `type`
-- drives rendering on the client; `data` carries the payload the UI needs to
-- act (e.g. a join request's id + household for inline approve/deny).

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade, -- recipient
  type text not null,            -- 'join_request' | 'join_approved' | 'join_denied' | ...
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- Hot paths: list a user's feed newest-first, and count their unread.
create index if not exists idx_notifications_user on notifications (user_id, created_at desc);
create index if not exists idx_notifications_user_unread on notifications (user_id) where read_at is null;
