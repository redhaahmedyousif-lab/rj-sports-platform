-- =============================================================
-- الخطوة 4: لوحة التحكم
-- إضافة/حذف الأحداث مع تحديث النتيجة في معاملة واحدة (transaction)
-- الدوال تعمل بصلاحيات المستدعي (security invoker) → سياسات RLS تبقى مطبّقة،
-- ومعها فحص صريح is_admin() كطبقة حماية إضافية.
-- =============================================================

create or replace function public.add_match_event(
  p_match_id uuid,
  p_type match_event_type,
  p_team team_side,
  p_minute int,
  p_extra_minute int default null,
  p_player text default null,
  p_secondary_player text default null,
  p_detail text default null
) returns public.match_events
language plpgsql security invoker set search_path = public as $$
declare
  v_event public.match_events;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.match_events (match_id, minute, extra_minute, type, team, player, secondary_player, detail)
  values (p_match_id, p_minute, p_extra_minute, p_type, p_team, coalesce(nullif(trim(p_player), ''), '—'),
          nullif(trim(p_secondary_player), ''), nullif(trim(p_detail), ''))
  returning * into v_event;

  -- الهدف (ومنه العكسي) يُحسب للفريق المحدد في الحدث
  if p_type in ('goal', 'own_goal', 'penalty_goal') then
    update public.matches
       set home_score = home_score + (p_team = 'home')::int,
           away_score = away_score + (p_team = 'away')::int
     where id = p_match_id;
  end if;

  return v_event;
end;
$$;

create or replace function public.delete_match_event(p_event_id uuid)
returns void
language plpgsql security invoker set search_path = public as $$
declare
  v_event public.match_events;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.match_events where id = p_event_id returning * into v_event;
  if v_event.id is null then
    return;
  end if;

  if v_event.type in ('goal', 'own_goal', 'penalty_goal') then
    update public.matches
       set home_score = greatest(0, home_score - (v_event.team = 'home')::int),
           away_score = greatest(0, away_score - (v_event.team = 'away')::int)
     where id = v_event.match_id;
  end if;
end;
$$;

revoke execute on function public.add_match_event from anon;
revoke execute on function public.delete_match_event from anon;

-- قيود سلامة البيانات
alter table public.matches
  add constraint matches_minute_range check (minute is null or minute between 0 and 130),
  add constraint matches_scores_positive check (home_score >= 0 and away_score >= 0);

create index if not exists profiles_premium_idx on public.profiles (is_premium) where is_premium;

-- لوحة التحكم تتحدث لحظياً عند اشتراك/إلغاء مستخدم (القراءة للمشرف فقط عبر RLS)
alter publication supabase_realtime add table public.subscriptions;
