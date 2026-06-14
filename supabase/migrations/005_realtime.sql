-- ============================================================
-- 005_realtime.sql
-- Hestia — live updates via Supabase Realtime
-- Run AFTER 002_rls_policies.sql
--
-- Lets a client react the instant *another* user changes shared state
-- (membership, household, devices, timers, access requests) instead of waiting
-- for the next manual refetch. Subscriptions are scoped by RLS, so a client only
-- receives rows it is already allowed to read.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Self-view on household_members.
-- Realtime evaluates RLS against the *old* row of a DELETE. The existing
-- "members can view roster" policy checks membership via a subquery, which is
-- already false the moment a user is removed — so without this, the removed user
-- would never receive the DELETE of their own row (the whole point of this
-- feature). Seeing one's own membership rows leaks nothing.
-- ────────────────────────────────────────────────────────────
create policy "household_members: users can view own membership"
  on public.household_members for select
  using (user_id = auth.uid());


-- ────────────────────────────────────────────────────────────
-- 2. REPLICA IDENTITY FULL.
-- A DELETE only ships the replica-identity columns; the default is the primary
-- key, which strips household_id / user_id / device_id. Those are exactly the
-- columns the realtime filters and the RLS check above rely on, so DELETEs would
-- otherwise be dropped or unauthorized. FULL ships the entire old row.
-- ────────────────────────────────────────────────────────────
alter table public.household_members replica identity full;
alter table public.devices           replica identity full;
alter table public.timers            replica identity full;
alter table public.join_requests     replica identity full;
alter table public.households         replica identity full;


-- ────────────────────────────────────────────────────────────
-- 3. Publish the subscribed tables (idempotent — safe to re-run).
-- ────────────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach t in array array['households', 'household_members', 'devices', 'timers', 'join_requests'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
