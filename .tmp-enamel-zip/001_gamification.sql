-- Fud AI — gamification schema
-- Run against a Neon branch first, not main.
--
-- Guardrail (see plan §1): no table in this migration stores a "goal met" flag
-- derived from intake, and no reward table references kcal or macros. Rewards
-- key off logging events only. Keep it that way.

begin;

create extension if not exists "pgcrypto";

/* ------------------------------------------------------------------ */
/* Streaks                                                             */
/* ------------------------------------------------------------------ */

create table if not exists streaks (
  user_id                 uuid primary key references users(id) on delete cascade,
  current                 integer     not null default 0 check (current >= 0),
  longest                 integer     not null default 0 check (longest >= 0),
  last_logged_date        date,
  freezes_held            smallint    not null default 0 check (freezes_held between 0 and 2),
  broken_on               date,
  broken_from             integer     not null default 0,
  repairs_used_in_month   smallint    not null default 0,
  repair_month            char(7),
  updated_at              timestamptz not null default now()
);

-- Days preserved by a freeze, rendered distinctly on the streak calendar.
create table if not exists streak_freeze_days (
  user_id     uuid not null references users(id) on delete cascade,
  local_date  date not null,
  primary key (user_id, local_date)
);

/* ------------------------------------------------------------------ */
/* XP and gems — append-only ledgers                                   */
/* ------------------------------------------------------------------ */

-- Never UPDATE these. Balances are derived. An append-only ledger is what
-- lets you audit a suspicious balance and reconstruct how it got there.

create table if not exists xp_ledger (
  id          bigserial   primary key,
  user_id     uuid        not null references users(id) on delete cascade,
  local_date  date        not null,
  amount      integer     not null check (amount > 0),
  reason      text        not null,
  ref_id      uuid,
  created_at  timestamptz not null default now()
);

create index if not exists xp_ledger_user_date_idx on xp_ledger (user_id, local_date desc);

-- One row per (user, day, reason, ref) stops a retried request from paying
-- twice. The client will retry on flaky mobile connections; assume it.
create unique index if not exists xp_ledger_dedupe_idx
  on xp_ledger (user_id, local_date, reason, coalesce(ref_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists gem_ledger (
  id          bigserial   primary key,
  user_id     uuid        not null references users(id) on delete cascade,
  amount      integer     not null check (amount <> 0),  -- negative = spend
  reason      text        not null,
  ref_id      uuid,
  created_at  timestamptz not null default now()
);

create index if not exists gem_ledger_user_idx on gem_ledger (user_id, created_at desc);

create or replace view gem_balances as
  select user_id, coalesce(sum(amount), 0)::integer as balance
  from gem_ledger
  group by user_id;

/* ------------------------------------------------------------------ */
/* Daily rollup                                                        */
/* ------------------------------------------------------------------ */

-- Denormalised on entry write. Today must render without aggregating entries.
create table if not exists daily_summaries (
  user_id         uuid    not null references users(id) on delete cascade,
  local_date      date    not null,
  ticket_no       integer not null,
  kcal            numeric(8,2) not null default 0,
  carb_g          numeric(8,2) not null default 0,
  protein_g       numeric(8,2) not null default 0,
  fat_g           numeric(8,2) not null default 0,
  water_glasses   smallint     not null default 0,
  habits_done     smallint     not null default 0,
  entry_count     smallint     not null default 0,
  xp_earned       integer      not null default 0,
  updated_at      timestamptz  not null default now(),
  primary key (user_id, local_date)
);

/* ------------------------------------------------------------------ */
/* Quests                                                              */
/* ------------------------------------------------------------------ */

create type quest_period as enum ('daily', 'weekly');

create table if not exists quests (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  period      quest_period not null,
  label       text not null,
  target      integer not null check (target > 0),
  xp_reward   integer not null check (xp_reward > 0),
  gem_reward  integer not null default 0,
  active      boolean not null default true,
  -- Enforces plan §1 at the schema level: no subtractive quests.
  -- 'stay under', 'limit', 'avoid' framings are restriction with a bow on.
  constraint quest_is_additive check (
    label !~* '\y(under|limit|avoid|less than|no more than|restrict|cut)\y'
  )
);

create table if not exists user_quests (
  user_id       uuid not null references users(id) on delete cascade,
  quest_id      uuid not null references quests(id) on delete cascade,
  period_start  date not null,
  progress      integer not null default 0,
  completed_at  timestamptz,
  claimed_at    timestamptz,
  primary key (user_id, quest_id, period_start)
);

create index if not exists user_quests_open_idx
  on user_quests (user_id, period_start desc) where claimed_at is null;

/* ------------------------------------------------------------------ */
/* Cosmetics                                                           */
/* ------------------------------------------------------------------ */

create type cosmetic_kind as enum ('outfit', 'theme', 'prop');

create table if not exists cosmetics (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  kind        cosmetic_kind not null,
  name        text not null,
  gem_price   integer not null default 0 check (gem_price >= 0),
  unlock_rule jsonb,          -- e.g. {"streak": 30}
  active      boolean not null default true
);

create table if not exists user_cosmetics (
  user_id      uuid not null references users(id) on delete cascade,
  cosmetic_id  uuid not null references cosmetics(id) on delete cascade,
  acquired_at  timestamptz not null default now(),
  equipped     boolean not null default false,
  primary key (user_id, cosmetic_id)
);

-- At most one equipped item per kind.
create unique index if not exists user_cosmetics_one_equipped_idx
  on user_cosmetics (user_id, (select kind from cosmetics c where c.id = cosmetic_id))
  where equipped;

/* ------------------------------------------------------------------ */
/* Mascot                                                              */
/* ------------------------------------------------------------------ */

create table if not exists mascot_state (
  user_id             uuid primary key references users(id) on delete cascade,
  name                text,
  mood                text not null default 'neutral'
                      check (mood in ('neutral','sleepy','excited','proud','curious','cozy')),
  activity_level      text not null default 'lively'
                      check (activity_level in ('lively','calm','off')),
  last_behavior_key   text,
  last_behavior_at    timestamptz,
  updated_at          timestamptz not null default now()
);

-- The mood CHECK above is the schema-level expression of the guardrail:
-- there is no 'sad', 'sick', 'guilty', or 'disappointed'. Adding one requires
-- a migration, which is exactly the friction we want.

/* ------------------------------------------------------------------ */
/* Habits                                                              */
/* ------------------------------------------------------------------ */

create table if not exists habits (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references users(id) on delete cascade,
  name     text not null,
  icon     text,
  active   boolean not null default true,
  sort     smallint not null default 0
);

create table if not exists habit_logs (
  user_id    uuid not null references users(id) on delete cascade,
  habit_id   uuid not null references habits(id) on delete cascade,
  local_date date not null,
  primary key (user_id, habit_id, local_date)
);

/* ------------------------------------------------------------------ */
/* Leagues (phase 6 — create now, populate later)                      */
/* ------------------------------------------------------------------ */

create table if not exists league_members (
  league_id   uuid not null,
  user_id     uuid not null references users(id) on delete cascade,
  week_start  date not null,
  tier        smallint not null default 0,
  xp          integer  not null default 0,
  primary key (week_start, user_id)
);

create index if not exists league_rank_idx on league_members (league_id, week_start, xp desc);

commit;
