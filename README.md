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
2. من **SQL Editor** شغّل ملفات `supabase/migrations/` بالترتيب (`0001_init.sql` ثم `0002_match_details.sql`).
3. ضع `NEXT_PUBLIC_SUPABASE_URL` و `NEXT_PUBLIC_SUPABASE_ANON_KEY` في `.env.local`.
4. لجعل حسابك مشرفاً: `update profiles set role = 'admin' where id = '<user-id>';`

## هيكل المشروع

```
src/
├── app/                        # الصفحات (App Router)
│   ├── layout.tsx              # الهيكل العام: RTL، خط Cairo، الهيدر والفوتر
│   ├── (home)/page.tsx         # ✅ الرئيسية: جدول المباريات الحية واليومية
│   ├── (home)/loading.tsx      # Skeleton أثناء التحميل
│   ├── match/[id]/page.tsx     # ✅ تفاصيل المباراة: البث، الأحداث، الإحصائيات، التشكيلة
│   ├── subscribe/              # ✅ صفحة الاشتراك + الدفع (Paddle) + صفحة نجاح الدفع
│   ├── login/                  # ✅ تسجيل الدخول برمز البريد / الرابط السحري / Google
│   ├── account/                # ✅ حسابي: حالة الاشتراك وإدارته
│   ├── auth/                   # callback + signout
│   ├── api/webhooks/paddle/    # ✅ استقبال أحداث Paddle وتفعيل Premium
│   └── admin/page.tsx          # ⏳ الخطوة 4: لوحة التحكم
├── components/
│   ├── layout/                 # Header, Footer
│   ├── matches/                # MatchCard, LeagueSection, DateSelector, MatchFilters,
│   │                           # FeaturedMatch, MatchStatusBadge, TeamCrest, LiveRefresher
│   ├── match/                  # MatchHeader, MatchTabs, MatchTimeline, MatchStats, Lineups, LiveMatchUpdates
│   ├── player/                 # VideoPlayer (HLS), PreRollAd, StreamPlaceholder
│   ├── ads/                    # BannerAd (تُخفى للمشتركين), PremiumPromo
│   └── ui/                     # أيقونات SVG، ComingSoon
├── lib/
│   ├── supabase/               # عملاء Supabase (server / browser / admin / proxy) + config
│   ├── paddle/                 # التحقق من التوقيع، منطق المزامنة، Customer Portal
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

## صفحة المباراة
- **المشغل** (`components/player/VideoPlayer.tsx`): يشغّل روابط HLS (`.m3u8`) بمكتبة hls.js، ويستخدم التشغيل الأصلي في Safari وiOS. فيه:
  - اختيار الجودة
  - زر «العودة للمباشر»
  - ملء الشاشة وصورة داخل صورة
  - اختصارات لوحة المفاتيح: `K` تشغيل/إيقاف، `M` كتم، `F` ملء الشاشة
  - إعادة المحاولة تلقائياً عند انقطاع الشبكة
  - إعلان مدته 5 ثوانٍ قبل البث للمستخدمين المجانيين
- **التحديث اللحظي**: مع Supabase يتحدث كل شيء فوراً عبر Realtime. بدونها تتحدث الصفحة كل 30 ثانية، ولا ينقطع الفيديو ولا يتغير التبويب المفتوح.
- **البيانات**: الإحصائيات محفوظة في `matches.stats`، والتشكيلات في `matches.lineups`، والأحداث في جدول `match_events`. الأشكال الكاملة في `src/types/database.ts`.

## الاشتراكات والمصادقة

### كيف يعمل الاشتراك
1. المستخدم يسجل الدخول (رمز من 6 أرقام أو رابط في البريد، أو Google).
2. في `/subscribe` يضغط «اشترك الآن» فتُفتح نافذة دفع Paddle، ويُمرَّر معها `user_id` في `customData`.
3. بعد الدفع ترسل Paddle حدث webhook إلى `/api/webhooks/paddle`، والخادم:
   - يتحقق من التوقيع (HMAC، وحد أقصى 5 دقائق).
   - يتجاهل الأحداث المكررة، والأحداث القديمة التي تصل متأخرة.
   - يحفظ الاشتراك ويحدّث `profiles.is_premium` و `premium_until`.
4. صفحة `/subscribe/success` تنتظر التفعيل وتتحدث تلقائياً. بعدها تختفي الإعلانات ويُفتح بث HD (النسخة المجانية حدها 480p).
5. الإلغاء من «حسابي» ← بوابة Paddle. يبقى Premium حتى نهاية الشهر المدفوع.

> **أمان:** المستخدم لا يستطيع تعديل `is_premium` بنفسه، فسياسات RLS لا تسمح بالكتابة. الكتابة تتم فقط من الـ webhook بمفتاح `service_role`.

### إعداد Paddle
1. **Catalog → Products:** أنشئ منتج «RJ Premium» وسعراً شهرياً بـ 1.99 USD، وانسخ `pri_...`.
2. **Developer Tools → Authentication:**
   - أنشئ Client-side token.
   - أنشئ API key بصلاحية Customer portal sessions.
3. **Developer Tools → Notifications:** أضف وجهة webhook على `https://<دومينك>/api/webhooks/paddle`، وفعّل أحداث `subscription.*`، ثم انسخ الـ Secret.
4. **Checkout → Checkout settings:** اضبط Default payment link على `https://<دومينك>/subscribe`. في الإنتاج يجب أن يوافق Paddle على الدومين.
5. ضع القيم في متغيرات البيئة كما في `.env.example`، وابدأ بـ `sandbox` واختبر ببطاقات Paddle التجريبية.

### إعداد Supabase Auth (الإنتاج)
- **Authentication → URL Configuration:** ضع Site URL على دومينك، وأضف `https://<دومينك>/auth/callback` إلى Redirect URLs.
- **Authentication → Email Templates:** انسخ القالبين من `supabase/templates/` (يحتويان الرمز `{{ .Token }}` والرابط).
- **Authentication → SMTP:** اربط مزود بريد (Resend أو SES…). مزود Supabase الافتراضي محدود جداً للإنتاج.
- **Google (اختياري):** فعّله من Providers، ثم ضع `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true`.

### وضع العرض (بدون Supabase)
إذا لم تُضبط مفاتيح Supabase، يظهر في صفحة الاشتراك زر «جرّب Premium» لمعاينة التجربة بدون دفع. هذا الزر لا يعمل أبداً عند ربط قاعدة البيانات.

## الاختبارات

```bash
npm test            # اختبارات الوحدة: التوقيع + منطق الاشتراك (Vitest)
```

اختبار شامل (39 فحصاً) على Supabase محلي يتطلب Docker:

```bash
npx supabase start && npx supabase db reset
bash scripts/dev-hls-stream.sh &        # بث HLS محلي
npm run build && npx next start -p 3100 &
npm run test:e2e
```

لتفاصيل `.env.local` المطلوب انظر رأس الملف `tests/e2e/subscription.e2e.cjs`.
