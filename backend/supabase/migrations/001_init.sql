-- Hestia initial schema (PRD section 18)
-- Run in the Supabase SQL editor or via the Supabase CLI.

-- 18.1 profiles ------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz default now()
);

-- 18.2 households ----------------------------------------------------------
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 18.3 household_members ---------------------------------------------------
create table if not exists household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  created_at timestamptz default now(),
  unique (household_id, user_id)
);

-- 18.4 devices -------------------------------------------------------------
create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete set null,
  device_name text default 'Kitchen Stove',
  pairing_code text unique not null,
  is_paired boolean default false,
  online_status boolean default false,
  stove_status text check (stove_status in ('on', 'off')) default 'off',
  presence_status text check (presence_status in ('detected', 'not_detected')) default 'not_detected',
  absence_timeout_seconds integer default 300,
  warning_delay_seconds integer default 30,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 18.5 join_requests -------------------------------------------------------
create table if not exists join_requests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'approved', 'denied')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  unique (household_id, user_id)
);

-- 18.6 timers --------------------------------------------------------------
create table if not exists timers (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  device_id uuid references devices(id) on delete cascade,
  created_by uuid references auth.users(id),
  duration_seconds integer not null,
  status text default 'active' check (status in ('active', 'cancelled', 'completed')),
  started_at timestamptz default now(),
  ends_at timestamptz not null
);

-- 18.7 events --------------------------------------------------------------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  device_id uuid references devices(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- 18.8 push_subscriptions --------------------------------------------------
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

-- Indexes for the backend's hot query paths --------------------------------
create index if not exists idx_household_members_lookup on household_members (household_id, user_id);
create index if not exists idx_household_members_user on household_members (user_id);
create index if not exists idx_devices_household on devices (household_id);
create index if not exists idx_events_household on events (household_id, created_at desc);
create index if not exists idx_events_device on events (device_id, created_at desc);
create index if not exists idx_timers_active on timers (status, ends_at);
create index if not exists idx_join_requests_household on join_requests (household_id, status);
create index if not exists idx_push_subscriptions_user on push_subscriptions (user_id);

-- Note: the backend uses the service-role key and bypasses RLS. It enforces
-- all access rules in application middleware (plugins/requireRole.js,
-- lib/deviceAccess.js). If you later expose Supabase directly to the client,
-- add RLS policies here.
