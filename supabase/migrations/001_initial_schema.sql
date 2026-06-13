-- ============================================================
-- 001_initial_schema.sql
-- Hestia — initial schema, triggers, and indexes
-- ============================================================

-- ─── 1. profiles ────────────────────────────────────────────
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  created_at timestamp with time zone default now()
);

-- ─── 2. households ──────────────────────────────────────────
create table public.households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- ─── 3. household_members ───────────────────────────────────
create table public.household_members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id)        on delete cascade,
  role         text not null check (role in ('admin', 'member')),
  created_at   timestamp with time zone default now(),
  unique (household_id, user_id)
);

-- ─── 4. devices ─────────────────────────────────────────────
create table public.devices (
  id                      uuid primary key default gen_random_uuid(),
  household_id            uuid references public.households(id) on delete set null,
  device_name             text default 'Kitchen Stove',
  pairing_code            text unique not null,
  is_paired               boolean default false,
  online_status           boolean default false,
  stove_status            text check (stove_status in ('on', 'off')) default 'off',
  presence_status         text check (presence_status in ('detected', 'not_detected')) default 'not_detected',
  absence_timeout_seconds integer default 300,
  warning_delay_seconds   integer default 30,
  created_at              timestamp with time zone default now(),
  updated_at              timestamp with time zone default now()
);

-- ─── 5. join_requests ───────────────────────────────────────
create table public.join_requests (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id)        on delete cascade,
  status       text default 'pending' check (status in ('pending', 'approved', 'denied')),
  reviewed_by  uuid references auth.users(id),
  reviewed_at  timestamp with time zone,
  created_at   timestamp with time zone default now(),
  unique (household_id, user_id)
);

-- ─── 6. timers ──────────────────────────────────────────────
create table public.timers (
  id               uuid primary key default gen_random_uuid(),
  household_id     uuid not null references public.households(id) on delete cascade,
  device_id        uuid not null references public.devices(id)    on delete cascade,
  created_by       uuid references auth.users(id) on delete set null,
  duration_seconds integer not null,
  status           text default 'active' check (status in ('active', 'cancelled', 'completed')),
  started_at       timestamp with time zone default now(),
  ends_at          timestamp with time zone not null
);

-- ─── 7. events ──────────────────────────────────────────────
create table public.events (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  device_id    uuid references public.devices(id)  on delete set null,
  user_id      uuid references auth.users(id)      on delete set null,
  event_type   text not null,
  metadata     jsonb,
  created_at   timestamp with time zone default now()
);

-- ─── 8. push_subscriptions ──────────────────────────────────
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamp with time zone default now()
);


-- ════════════════════════════════════════════════════════════
-- TRIGGER: auto-create profile row on new auth.users insert
-- SECURITY DEFINER: runs as postgres, not the calling auth role.
-- set search_path = '': prevents search-path injection attacks.
-- ════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ════════════════════════════════════════════════════════════
-- TRIGGER: keep devices.updated_at current on every update
-- ════════════════════════════════════════════════════════════
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger devices_updated_at
  before update on public.devices
  for each row execute procedure public.set_updated_at();


-- ════════════════════════════════════════════════════════════
-- INDEXES
-- ════════════════════════════════════════════════════════════

-- household_members
create index on public.household_members (household_id);
create index on public.household_members (user_id);

-- devices
create index on public.devices (household_id);

-- join_requests
create index on public.join_requests (household_id);
create index on public.join_requests (user_id);
create index on public.join_requests (status);

-- timers
create index on public.timers (household_id);
create index on public.timers (device_id);
create index on public.timers (status);

-- events
create index on public.events (household_id);
create index on public.events (device_id);
create index on public.events (created_at desc);

-- push_subscriptions
create index on public.push_subscriptions (user_id);
