-- =============================================================
-- الخطوة 2: أحداث المباراة + التشكيلات
-- =============================================================

create type match_event_type as enum (
  'goal', 'own_goal', 'penalty_goal', 'penalty_missed',
  'yellow_card', 'second_yellow', 'red_card', 'substitution', 'var'
);

create type team_side as enum ('home', 'away');

create table public.match_events (
  id                uuid primary key default gen_random_uuid(),
  match_id          uuid not null references public.matches(id) on delete cascade,
  minute            int  not null check (minute between 0 and 130),
  extra_minute      int  check (extra_minute between 1 and 30),
  type              match_event_type not null,
  team              team_side not null,
  player            text not null,
  secondary_player  text,   -- صانع الهدف / اللاعب الخارج في التبديل
  detail            text,
  created_at        timestamptz not null default now()
);

create index match_events_match_idx on public.match_events (match_id, minute);

-- التشكيلات: { "home": {formation, coach, starting[], substitutes[]}, "away": {...} }
alter table public.matches add column lineups jsonb;

alter table public.match_events enable row level security;
create policy "public read events" on public.match_events for select using (true);
create policy "admin write events" on public.match_events for all
  using (public.is_admin()) with check (public.is_admin());

alter publication supabase_realtime add table public.match_events;
