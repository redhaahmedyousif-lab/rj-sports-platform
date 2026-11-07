-- بيانات تجريبية للتطوير المحلي (npx supabase db reset)
-- المواعيد نسبية لوقت التشغيل حتى تظهر مباريات مباشرة دائماً

insert into public.leagues (id, name, country, priority) values
  ('a0000000-0000-4000-8000-000000000001', 'دوري أبطال أوروبا', 'أوروبا', 1),
  ('a0000000-0000-4000-8000-000000000002', 'دوري روشن السعودي', 'السعودية', 2),
  ('a0000000-0000-4000-8000-000000000003', 'دوري ناصر بن حمد الممتاز', 'البحرين', 3);

insert into public.teams (id, name, short_name) values
  ('b0000000-0000-4000-8000-000000000001', 'ريال مدريد', 'RMA'),
  ('b0000000-0000-4000-8000-000000000002', 'مانشستر سيتي', 'MCI'),
  ('b0000000-0000-4000-8000-000000000003', 'الهلال', 'HIL'),
  ('b0000000-0000-4000-8000-000000000004', 'النصر', 'NAS'),
  ('b0000000-0000-4000-8000-000000000005', 'المحرق', 'MUH'),
  ('b0000000-0000-4000-8000-000000000006', 'الرفاع', 'RIF');

insert into public.matches
  (id, league_id, home_team_id, away_team_id, kickoff_at, status, minute, home_score, away_score, venue, round, stream_url, is_featured, stats)
values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002',
   now() - interval '30 minutes', 'live', 30, 1, 0, 'سانتياغو برنابيو', 'ربع النهائي',
   'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', true,
   '{"possession":[55,45],"shots":[7,4],"shots_on_target":[3,1],"corners":[4,2],"fouls":[5,7],"yellow_cards":[0,1]}'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002',
   'b0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000004',
   now() + interval '2 hours', 'scheduled', null, 0, 0, 'المملكة أرينا', 'الجولة 12',
   'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', false, '{}'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003',
   'b0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000006',
   now() - interval '3 hours', 'finished', 90, 2, 2, 'استاد البحرين الوطني', 'الجولة 8',
   null, false, '{"possession":[48,52],"shots":[11,13],"shots_on_target":[5,6]}');

insert into public.match_events (match_id, minute, type, team, player, secondary_player) values
  ('c0000000-0000-4000-8000-000000000001', 12, 'goal', 'home', 'فينيسيوس جونيور', 'جود بيلينغهام'),
  ('c0000000-0000-4000-8000-000000000001', 24, 'yellow_card', 'away', 'رودري', null),
  ('c0000000-0000-4000-8000-000000000003', 20, 'goal', 'home', 'لاعب المحرق', null),
  ('c0000000-0000-4000-8000-000000000003', 55, 'goal', 'away', 'لاعب الرفاع', null),
  ('c0000000-0000-4000-8000-000000000003', 70, 'goal', 'home', 'لاعب المحرق', null),
  ('c0000000-0000-4000-8000-000000000003', 88, 'penalty_goal', 'away', 'لاعب الرفاع', null);

-- تقييمات تجريبية (8 تقييمات — أكثر من صفحة واحدة لاختبار «عرض المزيد»)
insert into public.reviews (name, rating, body, badge, reviewer_id, created_at) values
  ('أبو فهد', 5, 'أفضل تطبيق نتائج جربته، التحديث لحظي والبث بدون تقطيع.', 'premium', 'seed-1', now() - interval '3 hours'),
  ('سارة المطيري', 5, 'التصميم الداكن مريح للعين والإحصائيات مرتبة جداً.', 'member', 'seed-2', now() - interval '20 hours'),
  ('محمد الكعبي', 4, 'ممتاز بشكل عام، ودي يكون فيه إشعار عند تسجيل الأهداف.', 'guest', 'seed-3', now() - interval '1 day 2 hours'),
  ('نوف', 5, 'صفحة المباراة فيها كل شيء: الأحداث والتشكيلة والإحصائيات.', 'member', 'seed-4', now() - interval '2 days'),
  ('عبدالله', 3, 'الإعلان قبل البث مزعج شوي، اشتركت وارتحت.', 'guest', 'seed-5', now() - interval '3 days'),
  ('ريم الحربي', 5, 'بأقل من دولارين بالشهر وبدون إعلانات؟ صفقة ممتازة.', 'premium', 'seed-6', now() - interval '4 days'),
  ('خالد', 4, 'سريع جداً على الجوال، وأحب شريط التواريخ.', 'member', 'seed-7', now() - interval '6 days'),
  ('يوسف البلوشي', 5, 'تابعت الكلاسيكو كامل بجودة HD بدون أي مشكلة.', 'guest', 'seed-8', now() - interval '9 days');

insert into public.review_reactions (review_id, emoji, reactor_id)
select r.id, e.emoji, 'seed-reactor-' || g
from public.reviews r
cross join (values ('👍'), ('❤️'), ('🔥')) as e(emoji)
cross join generate_series(1, 3) as g
where r.reviewer_id in ('seed-1', 'seed-6');
