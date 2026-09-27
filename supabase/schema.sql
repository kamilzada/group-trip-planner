-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run in the same project as the Tele-bot (different table names).

create table if not exists trips (
  id              text primary key,                 -- short id used in the share link
  name            text not null,
  organizer       text not null,
  expected_count  int  not null default 5,
  admin_token     text not null,                    -- organiser link only; never returned by the API
  status          text not null default 'collecting', -- collecting | options | decided
  options         jsonb,                            -- group-level view of the 2-3 options
  private_fits    jsonb,                            -- per-person fit, keyed by submission id; only ever
                                                    -- returned to that person's own private link
  options_stale   boolean not null default false,   -- someone edited after options were generated
  decided_index   int,
  generated_at    timestamptz,
  created_at      timestamptz default now()
);

create table if not exists trip_submissions (
  id            uuid primary key default gen_random_uuid(),
  trip_id       text not null references trips(id) on delete cascade,
  token         text not null unique,               -- the person's private link
  name          text not null,
  home_city     text,
  budget_max    int  not null,                      -- INR per person, all-in
  date_from     date not null,
  date_to       date not null,
  nights        int  not null,
  types         text[] not null default '{}',
  dealbreakers  text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists trip_submissions_trip_idx on trip_submissions (trip_id);

-- Only the server (service_role key) touches these tables. With RLS on and no
-- policies, the public anon key can read nothing.
alter table trips enable row level security;
alter table trip_submissions enable row level security;
