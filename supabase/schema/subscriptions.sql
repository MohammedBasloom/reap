-- =============================================================
-- REAP — subscriptions
--
-- One row per user, written ONLY by the webhook running as the service role.
-- The browser can read its own row and nothing else: there are deliberately no
-- insert, update or delete policies, so a user cannot grant themselves a plan
-- by calling the REST API with their own token. RLS with no write policy is a
-- denial for every role except the service key, which bypasses RLS entirely.
--
-- Run once, in the Supabase SQL editor.
-- =============================================================

create table if not exists public.subscriptions (
  user_id                uuid primary key references auth.users(id) on delete cascade,

  -- "free" until a payment says otherwise. The client treats anything that is
  -- not an active paid plan as free, so a missing row is safe by default.
  plan                   text not null default 'free',

  -- Mirrors Dodo's own subscription status verbatim rather than a private
  -- vocabulary, so a support question can be answered by comparing this row to
  -- the Dodo dashboard without a translation table in between.
  status                 text not null default 'inactive',

  dodo_subscription_id   text unique,
  dodo_customer_id       text,

  -- When access lapses if nothing renews. Null means no end date is known —
  -- the entitlement check treats null as "not expiring", so it must only ever
  -- be null while status is inactive.
  current_period_end     timestamptz,

  -- Kept for support: the last event that touched this row, and when.
  last_event             text,
  updated_at             timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "read own subscription" on public.subscriptions;
create policy "read own subscription"
  on public.subscriptions
  for select
  using (auth.uid() = user_id);

-- Look-ups the webhook does by Dodo's identifiers rather than by user.
create index if not exists subscriptions_dodo_sub_idx
  on public.subscriptions (dodo_subscription_id);
create index if not exists subscriptions_dodo_cust_idx
  on public.subscriptions (dodo_customer_id);
