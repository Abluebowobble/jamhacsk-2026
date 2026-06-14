-- ============================================================
-- 004_audit_log.sql
-- Hestia — turn `events` into a full audit log.
-- Run AFTER 001_initial_schema.sql, 002_rls_policies.sql, 003_add_camera_stream_url.sql.
--
-- The events table already records WHAT happened (event_type) for a household /
-- device / user. This migration expands it into a proper audit log so it also
-- records WHO acted, from WHERE, the OUTCOME, and what CHANGED — capturing both
-- user actions (REST API) and autonomous device/system actions (MQTT, jobs).
-- ============================================================

alter table public.events
  -- ─── WHO ──────────────────────────────────────────────────
  -- actor_type disambiguates the existing user_id / device_id columns:
  -- 'user'   → a person acted via the REST API (user_id set)
  -- 'device' → a Hestia device acted autonomously via MQTT (device_id set)
  -- 'system' → a backend job acted (e.g. the timer poller)
  add column actor_type    text,
  -- Display label frozen at write time (email / device name), so the row stays
  -- meaningful even if the user or device is later deleted.
  add column actor_label   text,

  -- ─── WHERE (origin) ───────────────────────────────────────
  add column source        text,   -- 'rest_api' | 'mqtt' | 'system'
  add column ip_address    inet,    -- REST callers only
  add column user_agent    text,    -- REST callers only

  -- ─── OUTCOME ──────────────────────────────────────────────
  -- 'denied' lets the log capture blocked permission attempts (a member trying
  -- an admin-only action) — something a pure product feed never recorded.
  add column outcome       text not null default 'success',
  add column error_message text,

  -- ─── TARGET + CHANGE DETAIL ───────────────────────────────
  add column resource_type text,    -- 'device' | 'household' | 'member' | 'timer' | 'join_request' | ...
  add column resource_id   text,    -- uuid / external id of the thing acted on
  add column "before"      jsonb,   -- prior state for mutations
  add column "after"       jsonb;   -- new state for mutations


-- ─── Backfill existing rows so the new constraints pass ─────
update public.events
  set actor_type = case
        when user_id   is not null then 'user'
        when device_id is not null then 'device'
        else 'system' end,
      source = case
        when user_id   is not null then 'rest_api'
        when device_id is not null then 'mqtt'
        else 'system' end
  where actor_type is null;


-- ─── Value constraints (added after backfill) ───────────────
alter table public.events
  add constraint events_actor_type_check check (actor_type in ('user', 'device', 'system')),
  add constraint events_source_check     check (source     in ('rest_api', 'mqtt', 'system')),
  add constraint events_outcome_check    check (outcome    in ('success', 'failure', 'denied'));


-- ─── Indexes for the new audit query patterns ───────────────
create index on public.events (actor_type);
create index on public.events (resource_type, resource_id);
create index on public.events (outcome);


-- ════════════════════════════════════════════════════════════
-- DECOUPLE FROM REFERENCED ENTITIES (denormalized audit log)
-- The append-only triggers below block EVERY update and delete on events. But
-- the original FKs used ON DELETE CASCADE (household_id) and ON DELETE SET NULL
-- (device_id, user_id) — actions that fire an internal DELETE/UPDATE on the
-- referencing events rows whenever a household / device / user is removed. With
-- the triggers in place those internal writes would raise, making the parent
-- entity impossible to delete (e.g. you could never delete a user).
--
-- An audit log must also OUTLIVE the entities it references. So we drop the FK
-- constraints and keep household_id / device_id / user_id as plain id columns;
-- actor_label and resource_id preserve attribution even after the target is gone.
-- (RLS still works — its policies join on these ids, which don't need an FK.)
-- ════════════════════════════════════════════════════════════
alter table public.events drop constraint events_household_id_fkey;
alter table public.events drop constraint events_device_id_fkey;
alter table public.events drop constraint events_user_id_fkey;
alter table public.events alter column household_id drop not null;


-- ════════════════════════════════════════════════════════════
-- IMMUTABILITY — an audit log is append-only. These triggers block
-- UPDATE and DELETE for EVERY role, including the service-role key the
-- backend uses, so history can't be silently rewritten. (Resolves PRD
-- open question #10: event logs are read-only.)
--
-- Retention note: because DELETE is blocked, pruning old rows requires
-- temporarily dropping `events_no_delete` — a deliberate, auditable act.
-- ════════════════════════════════════════════════════════════
create or replace function public.events_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'events is append-only; % is not permitted', tg_op;
end;
$$;

create trigger events_no_update
  before update on public.events
  for each row execute procedure public.events_append_only();

create trigger events_no_delete
  before delete on public.events
  for each row execute procedure public.events_append_only();

-- RLS is unchanged: the existing "events: household members can view" policy
-- (002) still governs reads, and there is no INSERT policy, so only the backend
-- service-role key can write. NOTE: members can now see ip_address / user_agent;
-- if that exposure is unwanted, serve the feed through a column-limited view or
-- restrict the SELECT policy to role = 'admin'.
