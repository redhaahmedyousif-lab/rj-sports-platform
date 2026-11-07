# RJ Sports Platform ⚽

منصة رياضية لنتائج المباريات المباشرة والبث، مبنية بـ **Next.js (App Router) + Tailwind CSS + Supabase**.

## التشغيل

```bash
npm install
cp .env.example .env.local   # اختياري: بدون مفاتيح Supabase يعمل الموقع على بيانات تجريبية
npm run dev
```

ثم افتح http://localhost:3000

### ربط Supabase
1. أنشئ مشروعاً على supabase.com.
2. من **SQL Editor** شغّل الملف `supabase/migrations/0001_init.sql`.
3. ضع `NEXT_PUBLIC_SUPABASE_URL` و `NEXT_PUBLIC_SUPABASE_ANON_KEY` في `.env.local`.
4. لجعل حسابك مشرفاً: `update profiles set role = 'admin' where id = '<user-id>';`

## هيكل المشروع

```
src/
├── app/                        # الصفحات (App Router)
│   ├── layout.tsx              # الهيكل العام: RTL، خط Cairo، الهيدر والفوتر
│   ├── page.tsx                # ✅ الرئيسية: جدول المباريات الحية واليومية
│   ├── loading.tsx             # Skeleton أثناء التحميل
│   ├── match/[id]/page.tsx     # ⏳ الخطوة 2: تفاصيل المباراة + البث + الإحصائيات
│   ├── subscribe/page.tsx      # ⏳ الخطوة 3: الاشتراك 1.99$ شهرياً
│   └── admin/page.tsx          # ⏳ الخطوة 4: لوحة التحكم
├── components/
│   ├── layout/                 # Header, Footer
│   ├── matches/                # MatchCard, LeagueSection, DateSelector, MatchFilters,
│   │                           # FeaturedMatch, MatchStatusBadge, TeamCrest, LiveRefresher
│   ├── ads/                    # BannerAd (تُخفى للمشتركين), PremiumPromo
│   └── ui/                     # أيقونات SVG، ComingSoon
├── lib/
│   ├── supabase/               # عملاء Supabase (server / browser) + config
│   ├── data/                   # طبقة البيانات: matches.ts, user.ts, mock-data.ts
│   └── utils/                  # التواريخ والمنطقة الزمنية، حالات المباراة
└── types/database.ts           # أنواع الجداول
supabase/migrations/            # مخطط قاعدة البيانات + سياسات RLS
```

## ملاحظات تقنية
- الصفحة الرئيسية **Server Component**: البيانات تُجلب على الخادم، والفلاتر والتواريخ عبر رابط الصفحة (`?date=2026-11-07&filter=live`) فتكون قابلة للمشاركة وسريعة.
- عند وجود مباريات مباشرة تتحدث الصفحة تلقائياً كل 30 ثانية (`LiveRefresher`)، ويمكن لاحقاً التحويل إلى Supabase Realtime.
- الإعلانات (`BannerAd`) تختفي تلقائياً إذا كان `profiles.is_premium = true`.
- المنطقة الزمنية الافتراضية `Asia/Bahrain` وتُغيَّر من `NEXT_PUBLIC_APP_TIMEZONE`.
