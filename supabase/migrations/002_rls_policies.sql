-- ============================================================
-- 002_rls_policies.sql
-- Hestia — Row Level Security policies
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- Enable RLS on every table
alter table public.profiles           enable row level security;
alter table public.households         enable row level security;
alter table public.household_members  enable row level security;
alter table public.devices            enable row level security;
alter table public.join_requests      enable row level security;
alter table public.timers             enable row level security;
alter table public.events             enable row level security;
alter table public.push_subscriptions enable row level security;


-- ────────────────────────────────────────────────────────────
-- profiles
-- INSERT is intentionally blocked — the handle_new_user trigger
-- (SECURITY DEFINER) creates the row automatically, bypassing RLS.
-- ────────────────────────────────────────────────────────────
create policy "profiles: users see own row"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: users update own row"
  on public.profiles for update
  using (id = auth.uid());


-- ────────────────────────────────────────────────────────────
-- households
-- ────────────────────────────────────────────────────────────
create policy "households: members can view"
  on public.households for select
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = households.id
        and hm.user_id = auth.uid()
    )
  );

create policy "households: any auth'd user can create"
  on public.households for insert
  with check (auth.uid() is not null);

create policy "households: admins can update"
  on public.households for update
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = households.id
        and hm.user_id = auth.uid()
        and hm.role = 'admin'
    )
  );

create policy "households: admins can delete"
  on public.households for delete
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = households.id
        and hm.user_id = auth.uid()
        and hm.role = 'admin'
    )
  );


-- ────────────────────────────────────────────────────────────
-- household_members
-- ────────────────────────────────────────────────────────────
create policy "household_members: members can view roster"
  on public.household_members for select
  using (
    exists (
      select 1 from public.household_members hm2
      where hm2.household_id = household_members.household_id
        and hm2.user_id = auth.uid()
    )
  );

create policy "household_members: admins can add members"
  on public.household_members for insert
  with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'admin'
    )
  );

create policy "household_members: admins can update roles"
  on public.household_members for update
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'admin'
    )
  );

-- Admins can remove anyone; members can remove themselves (leave)
create policy "household_members: admins can remove or members can leave"
  on public.household_members for delete
  using (
    household_members.user_id = auth.uid()
    or exists (
      select 1 from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'admin'
    )
  );


-- ────────────────────────────────────────────────────────────
-- devices
-- Unassigned devices (household_id IS NULL) must be readable so the
-- pairing page can check device status before household assignment.
-- ────────────────────────────────────────────────────────────
create policy "devices: household members or unassigned can view"
  on public.devices for select
  using (
    household_id is null
    or exists (
      select 1 from public.household_members hm
      where hm.household_id = devices.household_id
        and hm.user_id = auth.uid()
    )
  );

create policy "devices: any auth'd user can insert (pairing)"
  on public.devices for insert
  with check (auth.uid() is not null);

create policy "devices: household members can update"
  on public.devices for update
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = devices.household_id
        and hm.user_id = auth.uid()
    )
  );

create policy "devices: admins can delete"
  on public.devices for delete
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = devices.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'admin'
    )
  );


-- ────────────────────────────────────────────────────────────
-- join_requests
-- No DELETE policy — requests are kept for audit history.
-- To re-request after denial, the backend deletes the old row via service key.
-- ────────────────────────────────────────────────────────────
create policy "join_requests: visible to requester and household admins"
  on public.join_requests for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.household_members hm
      where hm.household_id = join_requests.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'admin'
    )
  );

create policy "join_requests: auth'd users can create own request"
  on public.join_requests for insert
  with check (user_id = auth.uid());

create policy "join_requests: admins can review"
  on public.join_requests for update
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = join_requests.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'admin'
    )
  );


-- ────────────────────────────────────────────────────────────
-- timers
-- ────────────────────────────────────────────────────────────
create policy "timers: household members can view"
  on public.timers for select
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = timers.household_id
        and hm.user_id = auth.uid()
    )
  );

create policy "timers: household members can create"
  on public.timers for insert
  with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = timers.household_id
        and hm.user_id = auth.uid()
    )
  );

create policy "timers: household members can update"
  on public.timers for update
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = timers.household_id
        and hm.user_id = auth.uid()
    )
  );

create policy "timers: household members can delete"
  on public.timers for delete
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = timers.household_id
        and hm.user_id = auth.uid()
    )
  );


-- ────────────────────────────────────────────────────────────
-- events
-- Written exclusively by the backend via service role key.
-- Frontend clients can only read.
-- ────────────────────────────────────────────────────────────
create policy "events: household members can view"
  on public.events for select
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = events.household_id
        and hm.user_id = auth.uid()
    )
  );


-- ────────────────────────────────────────────────────────────
-- push_subscriptions
-- To update a subscription, delete and re-insert.
-- ────────────────────────────────────────────────────────────
create policy "push_subscriptions: users see own"
  on public.push_subscriptions for select
  using (user_id = auth.uid());

create policy "push_subscriptions: users insert own"
  on public.push_subscriptions for insert
  with check (user_id = auth.uid());

create policy "push_subscriptions: users delete own"
  on public.push_subscriptions for delete
  using (user_id = auth.uid());
