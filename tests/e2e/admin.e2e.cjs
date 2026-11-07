/**
 * اختبار شامل للوحة التحكم: الإخفاء (404) ← صلاحيات المشرف ← إدارة المباريات ← التحديث اللحظي ← RLS.
 *
 * المتطلبات (نفس subscription.e2e.cjs) + ADMIN_PATH في .env.local
 *   npm run build && npx next start -p 3100
 *   node tests/e2e/admin.e2e.cjs
 */
const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const fs = require("fs");

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(__dirname, "../../.env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const BASE = process.env.E2E_BASE_URL || "http://localhost:3100";
const MAILPIT = "http://127.0.0.1:54324";
const SLUG = env.ADMIN_PATH;
const ADMIN = `${BASE}/${SLUG}`;
const SHOTS = path.join(__dirname, "screenshots");
fs.mkdirSync(SHOTS, { recursive: true });
const shot = (n) => path.join(SHOTS, n);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const results = [];
const check = (name, cond, extra = "") => results.push([cond ? "PASS" : "FAIL", name, extra]);
const visible = (loc, timeout = 8000) => loc.waitFor({ state: "visible", timeout }).then(() => true, () => false);
const RUN = Date.now();

async function mailToken(email) {
  for (let i = 0; i < 40; i++) {
    const { messages } = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent("to:" + email)}`)).json();
    if (messages?.length) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json();
      return msg.HTML.match(/>(\d{6})</)[1];
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("no mail for " + email);
}

async function login(page, email) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("البريد الإلكتروني").fill(email);
  await page.getByRole("button", { name: "أرسل رمز الدخول" }).click();
  await page.getByLabel("رمز الدخول").waitFor();
  await page.getByLabel("رمز الدخول").fill(await mailToken(email));
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await page.waitForURL(`${BASE}/`);
  const users = await admin.auth.admin.listUsers();
  return users.data.users.find((u) => u.email === email).id;
}

/** نص صفحة 404 بعد إزالة القيم المتغيرة — للمقارنة */
async function notFoundSignature(res) {
  const html = await res.text();
  return { status: res.status, title: html.match(/<title>[^<]*/)?.[0], hasNotFound: html.includes("الصفحة غير موجودة") };
}

(async () => {
  if (!SLUG) throw new Error("ADMIN_PATH غير مضبوط في .env.local");
  const b = await chromium.launch();
  const errors = [];

  // ---------- 1) الإخفاء: كل غير المشرفين يرون 404 مطابقة لصفحة غير موجودة ----------
  const reference = await notFoundSignature(await fetch(`${BASE}/this-page-does-not-exist-${RUN}`));
  for (const p of [`/${SLUG}`, `/${SLUG}/matches`, `/${SLUG}/teams`, "/admin", "/admin-console", "/admin-console/matches/new"]) {
    const sig = await notFoundSignature(await fetch(BASE + p, { redirect: "manual" }));
    check(`زائر: ${p.replace(SLUG, "<secret>")} → 404 مطابقة`, JSON.stringify(sig) === JSON.stringify(reference), JSON.stringify(sig));
  }

  // مستخدم عادي مسجّل
  const userCtx = await b.newContext();
  const userPage = await userCtx.newPage();
  userPage.on("pageerror", (e) => errors.push("user: " + e.message));
  const userId = await login(userPage, `user${RUN}@example.com`);
  for (const p of [`/${SLUG}`, `/${SLUG}/matches/new`, "/admin-console"]) {
    const res = await userPage.goto(BASE + p);
    check(`مستخدم عادي: ${p.replace(SLUG, "<secret>")} → 404`, res.status() === 404 && (await userPage.getByText("الصفحة غير موجودة").isVisible()));
  }
  await userPage.goto(`${BASE}/account`);
  check("مستخدم عادي: لا رابط للوحة التحكم في حسابي", (await userPage.getByRole("link", { name: /لوحة التحكم/ }).count()) === 0);
  check("مستخدم عادي: المسار السري غير موجود في HTML", !(await userPage.content()).includes(SLUG));

  // ---------- 2) المشرف ----------
  const adminCtx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const ap = await adminCtx.newPage();
  ap.on("pageerror", (e) => errors.push("admin: " + e.message));
  const adminId = await login(ap, `admin${RUN}@example.com`);
  // قبل الترقية: 404
  check("قبل الترقية لمشرف: 404", (await ap.goto(ADMIN)).status() === 404);
  await admin.from("profiles").update({ role: "admin", full_name: "مشرف الاختبار" }).eq("id", adminId);

  const res = await ap.goto(ADMIN);
  check("المشرف: لوحة التحكم تفتح (200)", res.status() === 200 && (await ap.getByRole("heading", { name: "نظرة عامة" }).isVisible()));
  check("المشرف: ترويسة noindex + no-store", res.headers()["x-robots-tag"]?.includes("noindex") && res.headers()["cache-control"]?.includes("no-store"), JSON.stringify(res.headers()));
  check("المشرف: الوصول المباشر للمسار الداخلي ما زال 404", (await (await adminCtx.newPage()).goto(`${BASE}/admin-console`)).status() === 404);

  // الإحصائيات = قاعدة البيانات
  const dbCount = async (q) => (await q).count;
  const nowIso = new Date().toISOString();
  const expected = {
    total: await dbCount(admin.from("matches").select("*", { count: "exact", head: true })),
    live: await dbCount(admin.from("matches").select("*", { count: "exact", head: true }).in("status", ["live", "halftime"])),
    streaming: await dbCount(admin.from("matches").select("*", { count: "exact", head: true }).in("status", ["live", "halftime"]).not("stream_url", "is", null)),
    premium: await dbCount(admin.from("profiles").select("*", { count: "exact", head: true }).eq("is_premium", true).or(`premium_until.is.null,premium_until.gt.${nowIso}`)),
  };
  const stat = async (id) => Number(await ap.locator(`[data-stat="${id}"] [data-value]`).innerText());
  const shown = { total: await stat("total"), live: await stat("live"), streaming: await stat("streaming"), premium: await stat("premium") };
  check("الإحصائيات تطابق قاعدة البيانات", JSON.stringify(shown) === JSON.stringify(expected), `${JSON.stringify(shown)} vs ${JSON.stringify(expected)}`);
  await ap.screenshot({ path: shot("a1-overview.png") });

  // ---------- 3) الفرق والبطولات ----------
  await ap.getByRole("link", { name: /الفرق والبطولات/ }).click();
  await ap.getByLabel("الاسم").first().fill(`الاتحاد ${RUN % 1000}`);
  await ap.getByLabel("الاختصار").fill("itt");
  await ap.getByRole("button", { name: "إضافة الفريق" }).click();
  check("إضافة فريق", await visible(ap.getByText(/تمت إضافة «الاتحاد/)));
  await ap.getByLabel("الاسم").last().fill("كأس الملك");
  await ap.getByRole("button", { name: "إضافة البطولة" }).click();
  check("إضافة بطولة", await visible(ap.getByText("تمت إضافة «كأس الملك» ✓")));

  // ---------- 4) إنشاء مباراة + التحقق ----------
  await ap.getByRole("link", { name: /مباراة جديدة/ }).first().click();
  await ap.getByLabel("البطولة").selectOption({ label: "كأس الملك" });
  await ap.getByLabel("الفريق المضيف").selectOption({ label: "الهلال (HIL)" });
  await ap.getByLabel("الفريق الضيف").selectOption({ label: "الهلال (HIL)" });
  await ap.getByLabel(/موعد الانطلاق/).fill("2026-12-01T21:30");
  await ap.getByLabel(/رابط البث/).fill("javascript:alert(1)");
  await ap.getByRole("button", { name: "إنشاء المباراة" }).click();
  check("تحقق: نفس الفريق مرفوض", await visible(ap.getByText("لا يمكن أن يلعب الفريق ضد نفسه")));
  check("تحقق: رابط بث غير آمن مرفوض", await ap.getByText("رابط البث يجب أن يبدأ بـ https://").isVisible());
  await ap.screenshot({ path: shot("a2-validation.png"), fullPage: true });

  await ap.getByLabel("الفريق الضيف").selectOption({ label: `الاتحاد ${RUN % 1000} (ITT)` });
  await ap.getByLabel(/رابط البث/).fill(process.env.E2E_STREAM_URL || "http://localhost:8090/master.m3u8");
  await ap.getByLabel("الملعب").fill("المملكة أرينا");
  await ap.getByRole("button", { name: "إنشاء المباراة" }).click();
  await ap.waitForURL(new RegExp(`/${SLUG}/matches/[0-9a-f-]{36}\\?created=1`));
  const matchId = ap.url().match(/matches\/([0-9a-f-]{36})/)[1];
  check("إنشاء مباراة → صفحة التحكم بالمسار السري", true);
  const { data: created } = await admin.from("matches").select("kickoff_at, stream_url, status").eq("id", matchId).single();
  check("الموعد محفوظ بتوقيت UTC الصحيح (21:30 البحرين = 18:30Z)", created.kickoff_at.startsWith("2026-12-01T18:30:00"), created.kickoff_at);

  // ---------- 5) المتابع (زائر) يفتح صفحة المباراة في متصفح آخر ----------
  const fanCtx = await b.newContext();
  const fan = await fanCtx.newPage();
  fan.on("pageerror", (e) => errors.push("fan: " + e.message));
  await fan.goto(`${BASE}/match/${matchId}`, { waitUntil: "networkidle" });
  const fanScore = fan.locator("section span.text-4xl").first();
  const t0 = Date.now();

  // انطلاق المباراة
  await ap.getByRole("button", { name: "▶ انطلاق المباراة" }).click();
  check("المشرف: الحالة مباشر", await visible(ap.getByTestId("admin-status").getByText("مباشر")));
  check("المتابع: المشغل ظهر تلقائياً عند الانطلاق (Realtime)", await visible(fan.getByRole("button", { name: "شاهد البث المباشر" }), 8000));
  check("المتابع: النتيجة 0 - 0 بدون إعادة تحميل", await visible(fan.getByText("0 - 0").first(), 5000));

  // الدقيقة
  await ap.getByRole("button", { name: "الدقيقة +5" }).click();
  await visible(ap.getByTestId("admin-minute").getByText("6'"));
  check("المشرف: الدقيقة +5 → 6'", (await ap.getByTestId("admin-minute").innerText()).includes("6"));

  // هدف للمضيف
  await ap.getByRole("button", { name: "⚽ هدف" }).click();
  await ap.getByLabel("الدقيقة", { exact: true }).fill("6");
  await ap.getByLabel("اللاعب", { exact: true }).fill("سالم الدوسري");
  await ap.getByLabel("صانع الهدف (اختياري)").fill("مالكوم");
  await ap.getByRole("button", { name: "إضافة الحدث" }).click();
  check("المشرف: النتيجة تحدثت تلقائياً مع الهدف", await visible(ap.getByTestId("admin-score").getByText("0 - 1")));
  const goalSeenAt = await visible(fanScore.getByText("0 - 1"), 8000).then((ok) => (ok ? Date.now() : null));
  check("المتابع: الهدف ظهر لحظياً (Realtime) بدون إعادة تحميل", goalSeenAt !== null);
  check("المتابع: اسم الهداف في الصفحة", await visible(fan.getByText("سالم الدوسري").first(), 5000));

  // بطاقة + تبديل + VAR للضيف
  await ap.getByRole("radio", { name: `الاتحاد ${RUN % 1000}` }).check({ force: true });
  await ap.getByRole("button", { name: "🟨 صفراء" }).click();
  await ap.getByLabel("الدقيقة", { exact: true }).fill("20");
  await ap.getByLabel("اللاعب", { exact: true }).fill("كانتي");
  await ap.getByRole("button", { name: "إضافة الحدث" }).click();
  await visible(ap.locator('[data-event-type="yellow_card"]'));

  await ap.getByRole("button", { name: "🔁 تبديل" }).click();
  await ap.getByLabel("الدقيقة", { exact: true }).fill("30");
  await ap.getByLabel("اللاعب الداخل").fill("رومارينيو");
  await ap.getByRole("button", { name: "إضافة الحدث" }).click();
  check("تحقق: التبديل بدون اللاعب الخارج مرفوض", await visible(ap.getByText("أدخل اسم اللاعب الخارج")));
  await ap.getByLabel("اللاعب الخارج").fill("بنزيما");
  await ap.getByRole("button", { name: "إضافة الحدث" }).click();
  await visible(ap.locator('[data-event-type="substitution"]'));

  await ap.getByRole("button", { name: "📺 VAR" }).click();
  await ap.getByLabel("الدقيقة", { exact: true }).fill("33");
  await ap.getByLabel("اللاعب", { exact: true }).fill("حمدالله");
  await ap.getByLabel("التفاصيل").fill("إلغاء الهدف بداعي التسلل");
  await ap.getByRole("button", { name: "إضافة الحدث" }).click();
  await visible(ap.locator('[data-event-type="var"]'));
  check("المشرف: 4 أحداث في القائمة", (await ap.locator("[data-event-type]").count()) === 4);
  check("المتابع: التبديل وVAR ظهرا لحظياً", (await visible(fan.getByText("رومارينيو").first(), 8000)) && (await visible(fan.getByText("إلغاء الهدف بداعي التسلل").first(), 8000)));

  // الإحصائيات
  await ap.getByText("الإحصائيات الحية").click();
  await ap.getByLabel("الاستحواذ % — الهلال").fill("60");
  await ap.getByLabel(/الاستحواذ % — الاتحاد/).fill("30");
  await ap.getByRole("button", { name: "حفظ الإحصائيات" }).click();
  check("تحقق: الاستحواذ يجب أن يساوي 100", await visible(ap.getByText("مجموع الاستحواذ يجب أن يساوي 100")));
  await ap.getByLabel(/الاستحواذ % — الاتحاد/).fill("40");
  await ap.getByLabel("التسديدات — الهلال").fill("7");
  await ap.getByLabel(/التسديدات — الاتحاد/).fill("2");
  await ap.getByRole("button", { name: "حفظ الإحصائيات" }).click();
  check("حفظ الإحصائيات", await visible(ap.getByText("تم حفظ الإحصائيات ✓")));
  await fan.getByRole("tab", { name: "الإحصائيات" }).click();
  check("المتابع: الإحصائيات الحية ظهرت (60% استحواذ)", await visible(fan.getByText("60%"), 8000));
  await fan.getByRole("tab", { name: "الأحداث" }).click();
  await ap.screenshot({ path: shot("a3-live-control.png"), fullPage: true });
  await fan.screenshot({ path: shot("a4-fan-view.png"), fullPage: true });

  // الصفحة الرئيسية للمتابع تتحدث أيضاً
  const home = await fanCtx.newPage();
  await home.goto(BASE + "/?date=2026-12-01", { waitUntil: "networkidle" }); // تاريخ المباراة المنشأة
  const homeHasGoal = await visible(home.locator(`a[href="/match/${matchId}"]`).getByText("0 - 1").first(), 5000);

  // حذف الهدف ينقص النتيجة
  await ap.locator('[data-event-type="goal"]').getByRole("button", { name: /حذف/ }).click();
  await ap.locator('[data-event-type="goal"]').getByRole("button", { name: "تأكيد الحذف" }).click();
  check("حذف الهدف → النتيجة 0 - 0", await visible(ap.getByTestId("admin-score").getByText("0 - 0")));
  check("الرئيسية: النتيجة ظهرت ثم عادت لحظياً", homeHasGoal && (await visible(home.locator(`a[href="/match/${matchId}"]`).getByText("0 - 0").first(), 8000)));

  // تصحيح يدوي للنتيجة
  await ap.getByTestId("admin-score").click();
  await ap.getByLabel(/أهداف الهلال/).fill("2");
  await ap.getByLabel(/أهداف الاتحاد/).fill("1");
  await ap.getByRole("button", { name: "حفظ", exact: true }).click();
  check("تصحيح النتيجة يدوياً 1 - 2", await visible(ap.getByTestId("admin-score").getByText("1 - 2")));
  check("المتابع: التصحيح ظهر لحظياً", await visible(fanScore.getByText("1 - 2"), 8000));

  // نظرة عامة تتحدث (مباراة جارية جديدة)
  const ov = await adminCtx.newPage();
  await ov.goto(ADMIN);
  check("نظرة عامة: عدد المباريات الجارية زاد", Number(await ov.locator('[data-stat="live"] [data-value]').innerText()) === expected.live + 1);
  check("نظرة عامة: عدد ما يُبث الآن زاد", Number(await ov.locator('[data-stat="streaming"] [data-value]').innerText()) === expected.streaming + 1);

  // الاستراحة والنهاية
  await ap.getByRole("button", { name: "⏸ نهاية الشوط الأول" }).click();
  check("الاستراحة", await visible(ap.getByTestId("admin-status").getByText("استراحة")));
  check("المتابع: استراحة لحظياً", await visible(fan.getByText("استراحة").first(), 8000));
  check("نظرة عامة تتحدث لحظياً (Realtime) — المباراة في قائمة الجارية كاستراحة", await visible(ov.getByText("استراحة").first(), 8000));
  await ap.getByRole("button", { name: "▶ بداية الشوط الثاني" }).click();
  await visible(ap.getByTestId("admin-minute").getByText("46'"));
  await ap.getByRole("button", { name: "⏹ نهاية المباراة" }).click();
  check("نهاية المباراة", await visible(ap.getByTestId("admin-status").getByText("انتهت")));
  check("المتابع: انتهت لحظياً", await visible(fan.getByText("انتهت").first(), 8000));

  // تعديل البيانات
  await ap.getByText("بيانات المباراة (الفرق، الموعد، رابط البث)").click();
  await ap.getByLabel("الجولة / الدور").fill("نصف النهائي");
  await ap.getByRole("button", { name: "حفظ التعديلات" }).click();
  check("تعديل بيانات المباراة", await visible(ap.getByText("تم حفظ التعديلات ✓")));
  const { data: edited } = await admin.from("matches").select("round").eq("id", matchId).single();
  check("التعديل محفوظ في قاعدة البيانات", edited.round === "نصف النهائي");

  // قائمة المباريات + البحث
  await ap.goto(`${ADMIN}/matches?filter=finished&q=${encodeURIComponent("الاتحاد " + (RUN % 1000))}`);
  check("قائمة المباريات: البحث والفلترة", (await ap.locator("tbody tr").count()) === 1 && (await ap.getByText("نصف النهائي").count()) === 0);
  check("التنقل: العنصر النشط «المباريات»", (await ap.getByRole("navigation", { name: "لوحة التحكم" }).getByRole("link", { name: "المباريات", exact: true }).getAttribute("aria-current")) === "page");
  await ap.screenshot({ path: shot("a5-matches.png") });

  // ---------- 6) RLS: المستخدم العادي لا يكتب حتى لو تجاوز الواجهة ----------
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const normalEmail = `rls${RUN}@example.com`;
  await anon.auth.signInWithOtp({ email: normalEmail });
  await anon.auth.verifyOtp({ email: normalEmail, token: await mailToken(normalEmail), type: "email" });
  const ins = await anon.from("matches").insert({ league_id: created.league_id ?? "a0000000-0000-4000-8000-000000000001", home_team_id: "b0000000-0000-4000-8000-000000000001", away_team_id: "b0000000-0000-4000-8000-000000000002", kickoff_at: nowIso });
  check("RLS: مستخدم عادي لا يضيف مباراة", !!ins.error);
  await anon.from("matches").update({ home_score: 99 }).eq("id", matchId);
  const { data: after } = await admin.from("matches").select("home_score").eq("id", matchId).single();
  check("RLS: مستخدم عادي لا يعدّل النتيجة", after.home_score === 2);
  const rpc = await anon.rpc("add_match_event", { p_match_id: matchId, p_type: "goal", p_team: "home", p_minute: 1, p_player: "x" });
  check("RLS: مستخدم عادي لا يستدعي add_match_event", rpc.error?.code === "42501", JSON.stringify(rpc.error));
  const selfPromote = await anon.from("profiles").update({ role: "admin" }).eq("id", (await anon.auth.getUser()).data.user.id).select();
  const { data: roleAfter } = await admin.from("profiles").select("role").eq("id", (await anon.auth.getUser()).data.user.id).single();
  check("RLS: المستخدم لا يرقّي نفسه لمشرف", roleAfter.role === "user", JSON.stringify(selfPromote.error ?? selfPromote.data));
  const visitor = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const anonRpc = await visitor.rpc("delete_match_event", { p_event_id: "00000000-0000-4000-8000-000000000000" });
  check("RLS: الزائر لا يستدعي delete_match_event", !!anonRpc.error);

  // ---------- 7) حذف المباراة + إلغاء صلاحية المشرف ----------
  await ap.goto(`${ADMIN}/matches/${matchId}`);
  await ap.getByRole("button", { name: "حذف المباراة" }).click();
  await ap.getByRole("button", { name: "نعم، احذف" }).click();
  await ap.waitForURL(/matches\?deleted=1/);
  const { data: gone } = await admin.from("matches").select("id").eq("id", matchId).maybeSingle();
  const { count: orphanEvents } = await admin.from("match_events").select("*", { count: "exact", head: true }).eq("match_id", matchId);
  check("حذف المباراة وأحداثها", gone === null && orphanEvents === 0);

  await ap.goto(`${BASE}/account`);
  check("المشرف: رابط لوحة التحكم في حسابي", await ap.getByRole("link", { name: /لوحة التحكم/ }).isVisible());
  await admin.from("profiles").update({ role: "user" }).eq("id", adminId);
  check("سحب صلاحية المشرف → 404 فوراً", (await ap.goto(ADMIN)).status() === 404);

  // موبايل
  await admin.from("profiles").update({ role: "admin" }).eq("id", adminId);
  const mobile = await adminCtx.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  const widths = [];
  for (const sub of ["", "/matches?filter=all", "/matches/new", "/teams"]) {
    await mobile.goto(ADMIN + sub, { waitUntil: "networkidle" });
    widths.push(await mobile.evaluate(() => document.documentElement.scrollWidth));
  }
  await mobile.goto(ADMIN, { waitUntil: "networkidle" });
  check("موبايل: كل صفحات اللوحة بدون تمرير أفقي", widths.every((w) => w === 390), widths.join(","));
  await mobile.screenshot({ path: shot("a6-mobile.png"), fullPage: true });

  check("بدون أخطاء JavaScript", errors.length === 0, errors.join(" | "));
  void userId;
  await b.close();
  for (const r of results) console.log(r[0], r[1], r[0] === "FAIL" ? r[2] : "");
  const passed = results.filter((r) => r[0] === "PASS").length;
  console.log(`\n${passed}/${results.length} passed`);
  if (passed !== results.length) process.exitCode = 1;
})().catch((e) => {
  for (const r of results) console.log(r[0], r[1], r[0] === "FAIL" ? r[2] : "");
  console.error(e);
  process.exit(1);
});
