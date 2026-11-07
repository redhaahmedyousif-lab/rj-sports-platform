-- =============================================================
-- GoalMood plus — المخطط الأساسي لقاعدة البيانات
-- شغّل هذا الملف في Supabase → SQL Editor (أو عبر supabase db push)
-- =============================================================

-- ---------- الأنواع ----------
create type match_status as enum (
  'scheduled',  -- لم تبدأ
  'live',       -- جارية
  'halftime',   -- بين الشوطين
  'finished',   -- انتهت
  'postponed',  -- مؤجلة
  'cancelled'   -- ملغاة
);

create type user_role as enum ('user', 'admin');

-- ---------- الدوريات ----------
create table public.leagues (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  country     text,
  logo_url    text,
  priority    int  not null default 100, -- الأقل يظهر أولاً
  created_at  timestamptz not null default now()
);

-- ---------- الفرق ----------
create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  short_name  text,
  logo_url    text,
  country     text,
  created_at  timestamptz not null default now()
);

-- ---------- المباريات ----------
create table public.matches (
  id            uuid primary key default gen_random_uuid(),
  league_id     uuid not null references public.leagues(id) on delete cascade,
  home_team_id  uuid not null references public.teams(id),
  away_team_id  uuid not null references public.teams(id),
  kickoff_at    timestamptz not null,
  status        match_status not null default 'scheduled',
  minute        int,
  home_score    int not null default 0,
  away_score    int not null default 0,
  venue         text,
  round         text,
  stream_url    text,                 -- رابط البث (HLS .m3u8 أو embed)
  is_featured   boolean not null default false,
  stats         jsonb not null default '{}'::jsonb, -- إحصائيات المباراة
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint different_teams check (home_team_id <> away_team_id)
);

create index matches_kickoff_idx on public.matches (kickoff_at);
create index matches_status_idx  on public.matches (status);

-- ---------- الأخبار ----------
create table public.news (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  slug          text not null unique,
  excerpt       text,
  body          text,
  image_url     text,
  published_at  timestamptz default now(),
  created_at    timestamptz not null default now()
);

-- ---------- ملفات المستخدمين ----------
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text,
  avatar_url     text,
  role           user_role not null default 'user',
  is_premium     boolean not null default false,
  premium_until  timestamptz,
  created_at     timestamptz not null default now()
);

-- إنشاء profile تلقائياً عند تسجيل مستخدم جديد
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- تحديث updated_at تلقائياً
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger matches_touch before update on public.matches
  for each row execute function public.touch_updated_at();

-- ---------- الصلاحيات (RLS) ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.leagues  enable row level security;
alter table public.teams    enable row level security;
alter table public.matches  enable row level security;
alter table public.news     enable row level security;
alter table public.profiles enable row level security;

-- قراءة عامة للمحتوى
create policy "public read leagues" on public.leagues for select using (true);
create policy "public read teams"   on public.teams   for select using (true);
create policy "public read matches" on public.matches for select using (true);
create policy "public read news"    on public.news    for select using (published_at <= now());

-- الكتابة للمشرفين فقط
create policy "admin write leagues" on public.leagues for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write teams"   on public.teams   for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write matches" on public.matches for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write news"    on public.news    for all using (public.is_admin()) with check (public.is_admin());

-- كل مستخدم يقرأ ملفه فقط (التعديل على is_premium/role يتم من الخادم عبر service role)
create policy "own profile read" on public.profiles for select using (auth.uid() = id or public.is_admin());

-- تفعيل التحديث اللحظي (Realtime) لجدول المباريات
alter publication supabase_realtime add table public.matches;
