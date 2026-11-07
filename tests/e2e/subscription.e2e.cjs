/**
 * اختبار شامل لنظام الاشتراك (تسجيل الدخول ← الدفع ← Webhook ← Premium ← الإلغاء + RLS).
 *
 * المتطلبات:
 *   1. npx supabase start && npx supabase db reset      (Supabase محلي + البيانات التجريبية)
 *   2. .env.local بمفاتيح Supabase المحلية + قيم Paddle وهمية (انظر README)
 *   3. bash scripts/dev-hls-stream.sh                     (بث HLS محلي بجودتين على :8090)
 *   4. npm run build && npx next start -p 3100
 *   5. node tests/e2e/subscription.e2e.cjs
 *
 * Paddle.js يُستبدل بنسخة وهمية داخل المتصفح، والـ webhooks تُرسل موقّعة بـ PADDLE_WEBHOOK_SECRET.
 */
const { chromium } = require('playwright');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync(path.join(__dirname, '../../.env.local'), 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const SHOTS = path.join(__dirname, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });
const shot = (name) => path.join(SHOTS, name);
const BASE = process.env.E2E_BASE_URL || 'http://localhost:3100', MAILPIT = 'http://127.0.0.1:54324';
const LIVE_MATCH = 'c0000000-0000-4000-8000-000000000001';
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const results = [];
const visible = (loc, timeout = 8000) => loc.waitFor({ state: 'visible', timeout }).then(() => true, () => false);
const check = (name, cond, extra = '') => { results.push([cond ? 'PASS' : 'FAIL', name, extra]); };

async function latestMail(email) {
  for (let i = 0; i < 30; i++) {
    const { messages } = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent('to:' + email)}`)).json();
    if (messages?.length) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json();
      return { subject: msg.Subject, token: msg.HTML.match(/>(\d{6})</)?.[1], link: msg.HTML.match(/href="([^"]*verify[^"]*)"/)?.[1]?.replace(/&amp;/g, '&') };
    }
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error('no mail for ' + email);
}
async function clearMail() { await fetch(`${MAILPIT}/api/v1/messages`, { method: 'DELETE' }); }

let seq = 0;
async function webhook(type, data, occurredAt = new Date().toISOString(), { secret = env.PADDLE_WEBHOOK_SECRET } = {}) {
  const body = JSON.stringify({ event_id: `evt_e2e_${Date.now()}_${++seq}`, event_type: type, occurred_at: occurredAt, notification_id: 'ntf_1', data });
  const ts = Math.floor(Date.now() / 1000);
  const h1 = crypto.createHmac('sha256', secret).update(`${ts}:${body}`).digest('hex');
  const res = await fetch(`${BASE}/api/webhooks/paddle`, { method: 'POST', headers: { 'content-type': 'application/json', 'paddle-signature': `ts=${ts};h1=${h1}` }, body });
  return { status: res.status, json: await res.json() };
}
const PADDLE_STUB = `window.PaddleBillingV1=window.Paddle={Initialized:false,Environment:{set(e){window.__paddleEnv=e}},Initialize(o){this.Initialized=true;window.__paddleToken=o.token},Update(){},Checkout:{open(o){window.__checkout=o}}};`;

(async () => {
  await admin.from('matches').update({ stream_url: process.env.E2E_STREAM_URL || 'http://localhost:8090/master.m3u8' }).eq('id', LIVE_MATCH);
  await clearMail();
  const email = `fan${Date.now()}@example.com`;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.route('https://cdn.paddle.com/**', r => r.fulfill({ contentType: 'application/javascript', body: PADDLE_STUB }));

  // 1) زائر
  await p.goto(BASE + '/');
  check('زائر: زر دخول في الهيدر', await p.getByRole('link', { name: 'دخول' }).isVisible());
  check('زائر: الإعلانات ظاهرة', (await p.locator('[data-ad-slot]').count()) > 0);
  await p.goto(BASE + '/account');
  check('زائر: /account يحوّل للدخول', p.url().endsWith('/login?next=%2Faccount'), p.url());
  await p.goto(BASE + '/subscribe');
  await p.getByRole('link', { name: 'سجّل الدخول للاشتراك' }).click();
  await p.waitForURL(/\/login\?next=(%2F|\/)subscribe/);
  await p.screenshot({ path: shot('s1-login.png') });

  // 2) تسجيل الدخول بالرمز
  await p.getByLabel('البريد الإلكتروني').fill('not-an-email');
  await p.getByLabel('البريد الإلكتروني').evaluate(el => el.type = 'text'); // تجاوز تحقق المتصفح لاختبار تحقق الخادم
  await p.getByRole('button', { name: 'أرسل رمز الدخول' }).click();
  check('تحقق الخادم من البريد', await visible(p.getByText('أدخل بريداً إلكترونياً صحيحاً.')));
  await p.getByLabel('البريد الإلكتروني').fill(email);
  await p.getByRole('button', { name: 'أرسل رمز الدخول' }).click();
  await p.getByLabel('رمز الدخول').waitFor();
  const mail = await latestMail(email);
  check('البريد وصل بالعربية مع رمز ورابط', mail.subject === 'رمز الدخول إلى RJ Sports' && /^\d{6}$/.test(mail.token) && !!mail.link, mail.subject);
  await p.screenshot({ path: shot('s2-code.png') });
  await p.getByLabel('رمز الدخول').fill('000000');
  await p.getByRole('button', { name: 'تسجيل الدخول' }).click();
  check('رمز خاطئ يُرفض', await visible(p.getByText('الرمز غير صحيح أو انتهت صلاحيته.')));
  await p.getByLabel('رمز الدخول').fill(mail.token);
  await p.getByRole('button', { name: 'تسجيل الدخول' }).click();
  await p.waitForURL(BASE + '/subscribe');
  check('بعد الدخول: العودة لصفحة الاشتراك (next)', p.url() === BASE + '/subscribe');
  check('بعد الدخول: أيقونة الحساب في الهيدر', await p.getByRole('link', { name: 'حسابي' }).isVisible());

  // 3) فتح الدفع
  await p.waitForLoadState('networkidle');
  await p.getByRole('button', { name: /اشترك الآن/ }).click();
  await p.waitForFunction(() => window.__checkout, null, { timeout: 10000 });
  const checkout = await p.evaluate(() => ({ c: window.__checkout, env: window.__paddleEnv, token: window.__paddleToken }));
  const userId = checkout.c.customData.user_id;
  check('Paddle: البيئة sandbox والتوكن صحيح', checkout.env === 'sandbox' && checkout.token === 'test_local_fake_token');
  check('Paddle: السعر + البريد + user_id + لغة عربية + successUrl', checkout.c.items[0].priceId === 'pri_local_premium' && checkout.c.customer.email === email && /^[0-9a-f-]{36}$/.test(userId) && checkout.c.settings.locale === 'ar' && checkout.c.settings.successUrl === BASE + '/subscribe/success', JSON.stringify(checkout.c));

  // 4) قبل التفعيل: المشغل محدود بـ 480p
  await p.goto(BASE + '/match/' + LIVE_MATCH);
  await p.getByRole('button', { name: 'شاهد البث المباشر' }).click();
  check('مجاني: إعلان قبل البث', await p.getByText('مساحة إعلانية قبل البث').isVisible());
  await p.waitForTimeout(5300);
  await p.getByRole('button', { name: /تخطَّ الإعلان/ }).click();
  await p.waitForFunction(() => { const v = document.querySelector('video'); return v && v.currentTime > 1; }, null, { timeout: 20000 });
  await p.waitForTimeout(3000);
  check('مجاني: البث يعمل بـ 360p فقط', await p.evaluate(() => document.querySelector('video').videoHeight) === 360);
  await p.mouse.move(600, 300);
  await p.getByRole('button', { name: 'الجودة' }).click();
  check('مجاني: 720p مقفلة وتقود للاشتراك', await p.getByRole('menuitem', { name: /720p/ }).getAttribute('href') === '/subscribe');
  await p.screenshot({ path: shot('s3-free-quality.png') });

  // 5) Webhooks
  const periodEnd = new Date(Date.now() + 30 * 864e5).toISOString();
  const RUN = Date.now();
  const sub = { id: `sub_e2e_${RUN}`, status: 'active', customer_id: `ctm_e2e_${RUN}`, items: [{ price: { id: 'pri_local_premium' } }], current_billing_period: { starts_at: new Date().toISOString(), ends_at: periodEnd }, scheduled_change: null, custom_data: { user_id: userId } };
  check('Webhook: توقيع خاطئ = 401', (await webhook('subscription.created', sub, undefined, { secret: 'wrong' })).status === 401);

  // صفحة النجاح تنتظر الـ webhook
  await p.goto(BASE + '/subscribe/success');
  check('صفحة النجاح: حالة الانتظار', await p.getByText('جارٍ تفعيل اشتراكك').isVisible());
  await p.screenshot({ path: shot('s4-waiting.png') });
  const created = await webhook('subscription.created', sub);
  check('Webhook: subscription.created تمت معالجته', created.status === 200 && created.json.result === 'processed', JSON.stringify(created));
  const { data: profAfter } = await admin.from('profiles').select('is_premium, paddle_customer_id').eq('id', userId).single();
  check('قاعدة البيانات: is_premium=true وربط رقم العميل', profAfter.is_premium === true && profAfter.paddle_customer_id === sub.customer_id, JSON.stringify(profAfter));
  await p.getByText('مرحباً بك في Premium!').waitFor({ timeout: 10000 });
  check('صفحة النجاح: تتحول تلقائياً للتفعيل', true);
  await p.screenshot({ path: shot('s5-success.png') });
  const dup = await fetch(`${BASE}/api/webhooks/paddle`); // GET غير مدعوم
  check('Webhook: GET غير مسموح', dup.status === 405, String(dup.status));

  // 6) تجربة المشترك
  await p.goto(BASE + '/');
  check('مشترك: شارة Premium في الهيدر', await p.getByTitle('أنت مشترك').isVisible());
  check('مشترك: لا إعلانات في الرئيسية', (await p.locator('[data-ad-slot]').count()) === 0);
  await p.goto(BASE + '/match/' + LIVE_MATCH);
  check('مشترك: لا إعلانات في صفحة المباراة', (await p.locator('[data-ad-slot]').count()) === 0);
  await p.getByRole('button', { name: 'شاهد البث المباشر' }).click();
  check('مشترك: بدون إعلان قبل البث', !(await p.getByText('مساحة إعلانية قبل البث').isVisible()));
  await p.waitForFunction(() => document.querySelector('video')?.videoHeight === 720, null, { timeout: 25000 });
  check('مشترك: البث بجودة 720p HD', true);
  await p.screenshot({ path: shot('s6-premium-player.png') });

  // 7) صفحة الحساب
  await p.goto(BASE + '/account');
  check('الحساب: الحالة فعّال + تاريخ التجديد', await p.getByText('فعّال').isVisible() && await p.getByText('التجديد القادم').isVisible());
  await p.getByRole('button', { name: 'إدارة الاشتراك والفواتير' }).click();
  await p.waitForURL(/error=portal/);
  check('الحساب: فشل بوابة Paddle يظهر رسالة واضحة (لا API key محلياً)', await p.getByText('تعذّر فتح صفحة إدارة الاشتراك').isVisible());
  await p.screenshot({ path: shot('s7-account.png'), fullPage: true });

  // إلغاء مجدول ثم إلغاء نهائي، وحدث قديم متأخر
  await webhook('subscription.updated', { ...sub, scheduled_change: { action: 'cancel', effective_at: periodEnd } });
  await p.goto(BASE + '/account');
  check('إلغاء مجدول: ما زال Premium مع تاريخ الانتهاء', await p.getByText('ينتهي اشتراكك ولن يتجدد في').isVisible() && await p.getByText('RJ Premium').isVisible());
  const canceledAt = new Date().toISOString();
  await webhook('subscription.canceled', { ...sub, status: 'canceled', canceled_at: canceledAt, current_billing_period: null, scheduled_change: null }, canceledAt);
  const stale = await webhook('subscription.activated', sub, new Date(Date.now() - 3600e3).toISOString());
  check('حدث قديم متأخر يُتجاهل (stale)', stale.json.result === 'stale', JSON.stringify(stale.json));
  await p.goto(BASE + '/');
  check('بعد الإلغاء: الإعلانات عادت', (await p.locator('[data-ad-slot]').count()) > 0);

  // 8) أمان: المستخدم لا يستطيع منح نفسه Premium
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  await clearMail();
  await anon.auth.signInWithOtp({ email });
  const m2 = await latestMail(email);
  const { error: vErr } = await anon.auth.verifyOtp({ email, token: m2.token, type: 'email' });
  check('RLS: تسجيل دخول عميل مباشر', !vErr, vErr?.message);
  await anon.from('profiles').update({ is_premium: true, premium_until: null }).eq('id', userId);
  const { data: prof } = await admin.from('profiles').select('is_premium').eq('id', userId).single();
  check('RLS: تعديل is_premium من المتصفح مرفوض', prof.is_premium === false);
  const { error: insErr } = await anon.from('subscriptions').insert({ id: 'sub_fake', user_id: userId, customer_id: 'x', status: 'active', last_event_at: new Date().toISOString() });
  check('RLS: إنشاء اشتراك من المتصفح مرفوض', !!insErr, insErr?.message);
  const { data: evs } = await anon.from('paddle_events').select('*');
  check('RLS: سجل أحداث Paddle غير مرئي للمستخدم', Array.isArray(evs) && evs.length === 0);
  const { data: subs } = await anon.from('subscriptions').select('id');
  check('RLS: المستخدم يرى اشتراكه فقط', subs.length === 1 && subs[0].id === sub.id);

  // 9) الرابط السحري في متصفح آخر + تسجيل الخروج + open redirect
  const ctx2 = await b.newContext();
  const p2 = await ctx2.newPage();
  await p2.goto(BASE + '/login?next=//evil.com');
  await clearMail();
  await p2.getByLabel('البريد الإلكتروني').fill(email);
  await p2.getByRole('button', { name: 'أرسل رمز الدخول' }).click();
  const limited = await visible(p2.getByText('طلبات كثيرة. انتظر دقيقة ثم أعد المحاولة.'), 5000);
  check('حد الإرسال: رسالة واضحة عند طلب رمز جديد بسرعة', limited);
  if (limited) {
    await p2.waitForTimeout(61000);
    await p2.getByRole('button', { name: 'أرسل رمز الدخول' }).click();
  }
  await p2.getByLabel('رمز الدخول').waitFor();
  const m3 = await latestMail(email);
  await p2.goto(m3.link);
  await p2.waitForLoadState('networkidle');
  check('الرابط السحري يسجل الدخول + next خارجي يُتجاهل', p2.url() === BASE + '/' && await p2.getByRole('link', { name: 'حسابي' }).isVisible(), p2.url());
  await p2.goto(BASE + '/account');
  await p2.getByRole('button', { name: 'تسجيل الخروج' }).click();
  await p2.waitForURL(BASE + '/');
  check('تسجيل الخروج', await p2.getByRole('link', { name: 'دخول' }).isVisible());

  // 10) موبايل
  const mp = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  await mp.goto(BASE + '/subscribe', { waitUntil: 'networkidle' });
  await mp.screenshot({ path: shot('s8-mobile-subscribe.png'), fullPage: true });
  check('موبايل: بدون تمرير أفقي', await mp.evaluate(() => document.documentElement.scrollWidth) === 390);

  check('بدون أخطاء JavaScript', errors.length === 0, errors.join(' | '));
  await b.close();
  for (const r of results) console.log(r[0], r[1], r[0] === 'FAIL' ? r[2] : '');
  const passed = results.filter(r => r[0] === 'PASS').length;
  console.log(`\n${passed}/${results.length} passed`);
  if (passed !== results.length) process.exitCode = 1;
})().catch(e => { for (const r of results) console.log(r[0], r[1], r[0] === 'FAIL' ? r[2] : ''); console.error(e); process.exit(1); });

