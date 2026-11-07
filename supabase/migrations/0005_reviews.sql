-- =============================================================
-- تقييمات المستخدمين والتفاعلات
-- القراءة والكتابة تتم من الخادم فقط (service_role) بعد التحقق وتحديد معدل الإرسال،
-- لذلك RLS مفعّل بدون أي سياسات: لا يمكن للمتصفح قراءة الجداول أو الكتابة فيها مباشرة،
-- ولا تُكشف معرّفات المرسلين (reviewer_id / ip_hash) أبداً.
-- =============================================================

create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 2 and 40),
  rating       smallint not null check (rating between 1 and 5),
  body         text not null check (char_length(body) between 5 and 600),
  badge        text not null default 'guest' check (badge in ('guest', 'member', 'premium')),
  user_id      uuid references auth.users(id) on delete set null,
  reviewer_id  text not null,          -- معرّف مجهول من كوكي المتصفح
  ip_hash      text,                   -- SHA-256 لعنوان IP (لا يُخزن العنوان نفسه)
  is_hidden    boolean not null default false,
  created_at   timestamptz not null default now()
);

create index reviews_visible_idx on public.reviews (created_at desc, id desc) where not is_hidden;
create index reviews_reviewer_idx on public.reviews (reviewer_id, created_at desc);
create index reviews_ip_idx on public.reviews (ip_hash, created_at desc);

create table public.review_reactions (
  review_id   uuid not null references public.reviews(id) on delete cascade,
  emoji       text not null check (emoji in ('👍', '❤️', '🔥', '😮', '😂')),
  reactor_id  text not null,
  created_at  timestamptz not null default now(),
  primary key (review_id, emoji, reactor_id)
);

alter table public.reviews enable row level security;
alter table public.review_reactions enable row level security;

-- ملخص التقييمات (المخفية مستثناة)
create or replace function public.review_summary()
returns table (total bigint, average numeric, r5 bigint, r4 bigint, r3 bigint, r2 bigint, r1 bigint)
language sql stable set search_path = public as $$
  select count(*),
         coalesce(round(avg(rating)::numeric, 1), 0),
         count(*) filter (where rating = 5),
         count(*) filter (where rating = 4),
         count(*) filter (where rating = 3),
         count(*) filter (where rating = 2),
         count(*) filter (where rating = 1)
  from public.reviews where not is_hidden;
$$;

-- عدد كل تفاعل لكل تقييم + هل تفاعل به الزائر الحالي
create or replace function public.review_reaction_counts(p_review_ids uuid[], p_reactor text)
returns table (review_id uuid, emoji text, total bigint, mine boolean)
language sql stable set search_path = public as $$
  select review_id, emoji, count(*), bool_or(reactor_id = p_reactor)
  from public.review_reactions
  where review_id = any (p_review_ids)
  group by review_id, emoji;
$$;

-- تبديل التفاعل (إضافة أو إزالة) في معاملة واحدة
create or replace function public.toggle_review_reaction(p_review_id uuid, p_emoji text, p_reactor text)
returns boolean
language plpgsql set search_path = public as $$
declare
  v_deleted int;
begin
  if not exists (select 1 from public.reviews where id = p_review_id and not is_hidden) then
    raise exception 'review not found' using errcode = 'P0002';
  end if;
  delete from public.review_reactions
   where review_id = p_review_id and emoji = p_emoji and reactor_id = p_reactor;
  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    insert into public.review_reactions (review_id, emoji, reactor_id) values (p_review_id, p_emoji, p_reactor);
    return true;
  end if;
  return false;
end;
$$;

-- الدوال للخادم فقط
revoke execute on function public.review_summary from public, anon, authenticated;
revoke execute on function public.review_reaction_counts from public, anon, authenticated;
revoke execute on function public.toggle_review_reaction from public, anon, authenticated;
grant execute on function public.review_summary to service_role;
grant execute on function public.review_reaction_counts to service_role;
grant execute on function public.toggle_review_reaction to service_role;
