/**
 * اختبار شامل لقسم التقييمات والشركاء في الصفحة الرئيسية.
 *
 * الوضعان:
 *   - مع Supabase (الافتراضي): نفس متطلبات subscription.e2e.cjs + npx supabase db reset (لبيانات التقييمات التجريبية)
 *   - الوضع التجريبي بدون Supabase:  E2E_MODE=demo node tests/e2e/reviews.e2e.cjs
 *     (ابنِ وشغّل الموقع بدون .env.local)
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const DEMO = process.env.E2E_MODE === "demo";
const BASE = process.env.E2E_BASE_URL || "http://localhost:3100";
const env = DEMO
  ? {}
  : Object.fromEntries(
      fs
        .readFileSync(path.join(__dirname, "../../.env.local"), "utf8")
        .split("\n")
        .filter((l) => l.includes("=") && !l.startsWith("#"))
        .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
    );
const SHOTS = path.join(__dirname, "screenshots");
fs.mkdirSync(SHOTS, { recursive: true });
const shot = (n) => path.join(SHOTS, n);

const results = [];
const check = (name, cond, extra = "") => results.push([cond ? "PASS" : "FAIL", name, extra]);
const visible = (loc, timeout = 8000) => loc.waitFor({ state: "visible", timeout }).then(() => true, () => false);
const RUN = Date.now();

(async () => {
  const admin = DEMO ? null : require("@supabase/supabase-js").createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  if (admin) {
    // بداية نظيفة: حذف تقييمات الاختبارات السابقة
    await admin.from("reviews").delete().like("name", "مختبر%");
  }

  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && !m.text().includes("404") && errors.push(m.text()));

  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  const section = p.locator("#reviews");
  await section.scrollIntoViewIfNeeded();

  // ---------- 1) الملخص والقائمة ----------
  const total0 = Number(await p.getByTestId("rating-total").innerText());
  const avg0 = Number(await p.getByTestId("rating-average").innerText());
  if (admin) {
    const { data } = await admin.from("reviews").select("rating").eq("is_hidden", false);
    const avg = Math.round((data.reduce((a, r) => a + r.rating, 0) / data.length) * 10) / 10;
    check("الملخص يطابق قاعدة البيانات (العدد والمتوسط)", total0 === data.length && avg0 === avg, `${total0}/${avg0} vs ${data.length}/${avg}`);
  } else {
    check("الملخص يظهر (وضع تجريبي)", total0 === 12 && avg0 > 4 && avg0 <= 5, `${total0}/${avg0}`);
  }
  const cards = section.locator("article[data-review-id]");
  check("أول صفحة: 6 تقييمات", (await cards.count()) === 6);
  const firstCard = cards.first();
  check("البطاقة: اسم + شارة + وقت + نجوم + نص", (await firstCard.locator("h3").count()) === 1 && (await firstCard.locator("time").innerText()).startsWith("منذ") && (await firstCard.getByRole("img", { name: /من 5 نجوم/ }).count()) === 1);
  check("البطاقة: 5 أزرار تفاعل", (await firstCard.locator("[data-emoji]").count()) === 5);

  await p.getByRole("button", { name: "عرض المزيد" }).click();
  await p.waitForFunction(() => document.querySelectorAll("#reviews article[data-review-id]").length > 6);
  const afterMore = await cards.count();
  check("عرض المزيد: تحميل باقي التقييمات", afterMore === total0 || afterMore === 12, String(afterMore));
  check("عرض المزيد: يختفي الزر عند النهاية", (await p.getByRole("button", { name: "عرض المزيد" }).count()) === (afterMore < total0 ? 1 : 0));
  const ids = await cards.evaluateAll((els) => els.map((e) => e.dataset.reviewId));
  check("لا تكرار في القائمة", new Set(ids).size === ids.length);
  await p.screenshot({ path: shot("r1-reviews.png"), fullPage: false, clip: await section.boundingBox().then((bb) => ({ x: 0, y: bb.y, width: 1366, height: Math.min(bb.height, 1400) })) });

  // ---------- 2) التحقق والعداد ----------
  const form = p.locator("form[aria-labelledby=review-form-title]");
  await form.getByRole("button", { name: "إرسال التقييم" }).click();
  check("تحقق: الاسم والتقييم والتعليق مطلوبة", (await visible(form.getByText("أدخل اسمك"))) && (await form.getByText("اختر تقييمك").isVisible()) && (await form.getByText(/اكتب تعليقاً/).isVisible()));
  await form.getByLabel("التعليق").fill("رائع 🔥🔥");
  check("العداد يحسب الإيموجي حرفاً واحداً (7/500)", (await p.getByTestId("char-counter").innerText()) === "7/500", await p.getByTestId("char-counter").innerText());
  await form.getByLabel("التعليق").fill("أ".repeat(501));
  check("أكثر من 500: العداد أحمر وزر الإرسال معطّل", (await p.getByTestId("char-counter").innerText()) === "501/500" && (await form.getByRole("button", { name: "إرسال التقييم" }).isDisabled()));

  // ---------- 3) إرسال تقييم ----------
  const name = `مختبر ${RUN % 10000}`;
  const xss = `<img src=x onerror="window.__xss=1"> تطبيق ممتاز جداً`;
  await form.getByLabel("الاسم").fill(name);
  await form.getByRole("radio", { name: /4 نجوم/ }).check({ force: true });
  check("النجوم التفاعلية: اختيار 4 = «جيد جداً»", await form.getByText("جيد جداً").isVisible());
  await form.getByLabel("التعليق").fill(xss);
  const submit = form.getByRole("button", { name: "إرسال التقييم" });
  await submit.click();
  check("زر الإرسال: حالة التحميل", await visible(form.getByRole("button", { name: "جارٍ الإرسال…" }), 3000));
  check("رسالة النجاح", await visible(form.getByText("شكراً لك! تم نشر تقييمك.")));
  const top = cards.first();
  check("التقييم الجديد أول القائمة", (await top.locator("h3").innerText()) === name);
  check("التقييم الجديد: شارة زائر + «منذ لحظات» + 4 نجوم", (await top.getByText("زائر").isVisible()) && (await top.locator("time").innerText()) === "منذ لحظات" && (await top.getByRole("img", { name: "4 من 5 نجوم" }).count()) === 1);
  check("XSS: النص يظهر كنص ولا يُنفَّذ", (await top.locator("img").count()) === 0 && (await p.evaluate(() => window.__xss)) === undefined && (await top.getByText("<img src=x").isVisible()));
  check("النموذج فُرّغ بعد الإرسال", (await form.getByLabel("الاسم").inputValue()) === "" && (await p.getByTestId("char-counter").innerText()) === "0/500");
  await p.waitForFunction((t) => Number(document.querySelector('[data-testid=rating-total]').textContent) === t, total0 + 1, { timeout: 8000 }).catch(() => {});
  check("الملخص تحدّث: العدد +1", Number(await p.getByTestId("rating-total").innerText()) === total0 + 1);

  // تحديد المعدل
  await form.getByLabel("الاسم").fill(name + " 2");
  await form.getByRole("radio", { name: /5 نجوم/ }).check({ force: true });
  await form.getByLabel("التعليق").fill("تقييم ثانٍ مباشرة");
  await form.getByRole("button", { name: "إرسال التقييم" }).click();
  check("تحديد المعدل: تقييم ثانٍ خلال دقيقتين مرفوض", await visible(form.getByText(/انتظر دقيقتين/)));
  check("تحديد المعدل: النص لم يُفقد بعد الرفض", (await form.getByLabel("التعليق").inputValue()) === "تقييم ثانٍ مباشرة");

  // ---------- 4) التفاعلات ----------
  const target = cards.nth(1);
  const targetId = await target.getAttribute("data-review-id");
  const like = target.locator('[data-emoji="👍"]');
  const before = Number(await like.locator("span").last().innerText());
  await like.click();
  await p.waitForFunction(([id, n]) => {
    const el = document.querySelector(`[data-review-id="${id}"] [data-emoji="👍"]`);
    return el?.getAttribute("aria-pressed") === "true" && Number(el.lastElementChild.textContent) === n;
  }, [targetId, before + 1]);
  check("تفاعل 👍: العدد +1 والزر مفعّل", true);
  await target.locator('[data-emoji="🔥"]').click();
  await p.waitForTimeout(800);

  await p.reload({ waitUntil: "networkidle" });
  const reloaded = p.locator(`[data-review-id="${targetId}"]`);
  check(
    "بعد إعادة التحميل: التفاعلات محفوظة ومميزة للزائر نفسه",
    (await reloaded.locator('[data-emoji="👍"]').getAttribute("aria-pressed")) === "true" &&
      Number(await reloaded.locator('[data-emoji="👍"] span').last().innerText()) === before + 1 &&
      (await reloaded.locator('[data-emoji="🔥"]').getAttribute("aria-pressed")) === "true",
  );

  // زائر آخر
  const other = await (await b.newContext()).newPage();
  await other.goto(BASE + "/", { waitUntil: "networkidle" });
  const otherCard = other.locator(`[data-review-id="${targetId}"]`);
  check("زائر آخر: يرى العدد لكن الزر غير مفعّل له", (await otherCard.locator('[data-emoji="👍"]').getAttribute("aria-pressed")) === "false" && Number(await otherCard.locator('[data-emoji="👍"] span').last().innerText()) === before + 1);
  await otherCard.locator('[data-emoji="👍"]').click();
  await other.waitForFunction(([id, n]) => Number(document.querySelector(`[data-review-id="${id}"] [data-emoji="👍"]`).lastElementChild.textContent) === n, [targetId, before + 2]);
  check("زائر آخر: تفاعله يُضاف للعدد (+2)", true);

  // إلغاء التفاعل
  await reloaded.locator('[data-emoji="👍"]').click();
  await p.waitForFunction(([id, n]) => {
    const el = document.querySelector(`[data-review-id="${id}"] [data-emoji="👍"]`);
    return el.getAttribute("aria-pressed") === "false" && Number(el.lastElementChild.textContent) === n;
  }, [targetId, before + 1]);
  check("إلغاء التفاعل: العدد −1", true);

  // ---------- 5) الشركاء ----------
  const partners = p.locator("#partners a[data-partner]");
  const hrefs = await partners.evaluateAll((els) => els.map((a) => [a.href, a.target, a.rel]));
  check("الشركاء: 6 قنوات", hrefs.length === 6, String(hrefs.length));
  check("الشركاء: https + نافذة جديدة + noopener", hrefs.every(([h, t, r]) => h.startsWith("https://") && t === "_blank" && r.includes("noopener")));
  await p.locator("#partners").screenshot({ path: shot("r2-partners.png") });

  // ---------- 6) الأمان (Supabase) ----------
  if (!DEMO) {
    const anon = require("@supabase/supabase-js").createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const read = await anon.from("reviews").select("reviewer_id, ip_hash");
    check("RLS: المتصفح لا يقرأ جدول التقييمات (ولا معرّفات المرسلين)", !read.data?.length, JSON.stringify(read.data?.[0] ?? read.error?.message));
    const ins = await anon.from("reviews").insert({ name: "hacker", rating: 5, body: "fake fake", reviewer_id: "x" });
    check("RLS: المتصفح لا يضيف تقييماً مباشرة (تجاوز تحديد المعدل)", !!ins.error);
    const rpc = await anon.rpc("toggle_review_reaction", { p_review_id: targetId, p_emoji: "👍", p_reactor: "x" });
    check("RLS: المتصفح لا يستدعي دالة التفاعل مباشرة", !!rpc.error);
    const { data: stored } = await admin.from("reviews").select("ip_hash, reviewer_id, badge").eq("name", name).single();
    check("الخادم: الشارة guest، ومعرّف مجهول، ولا يُخزَّن عنوان IP خاماً", stored.badge === "guest" && /^[0-9a-f-]{36}$/.test(stored.reviewer_id) && (stored.ip_hash === null || /^[0-9a-f]{32}$/.test(stored.ip_hash)));

    // ---------- 7) الإشراف من لوحة التحكم ----------
    // مشرف مؤقت: إنشاء الحساب وترقيته، ثم جلسة عبر رمز التحقق وكوكي @supabase/ssr
    const email = `modadmin${RUN}@example.com`;
    const adminUser = (await admin.auth.admin.createUser({ email, email_confirm: true })).data.user;
    await admin.from("profiles").update({ role: "admin" }).eq("id", adminUser.id);
    const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
    const { data: sess } = await anon.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: "magiclink" });
    const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
    const adminCtx = await b.newContext();
    await adminCtx.addCookies([{ name: `sb-${ref}-auth-token`, value: "base64-" + Buffer.from(JSON.stringify(sess.session)).toString("base64url"), url: BASE }]);
    const ap = await adminCtx.newPage();
    const res = await ap.goto(`${BASE}/${env.ADMIN_PATH}/reviews`);
    check("لوحة التحكم: صفحة التقييمات تفتح للمشرف", res.status() === 200 && (await ap.getByRole("heading", { name: "التقييمات" }).isVisible()), String(res.status()));
    const row = ap.locator("li[data-admin-review]").filter({ hasText: name });
    await row.getByRole("button", { name: "إخفاء" }).click();
    await visible(row.getByText("مخفي"));
    await p.goto(BASE + "/", { waitUntil: "networkidle" });
    check("الإخفاء: يختفي من الرئيسية وينقص العدد", (await p.locator("#reviews h3", { hasText: name }).count()) === 0 && Number(await p.getByTestId("rating-total").innerText()) === total0);
    await row.getByRole("button", { name: "حذف" }).click();
    await ap.waitForTimeout(1000);
    const { count } = await admin.from("reviews").select("*", { count: "exact", head: true }).eq("name", name);
    check("الحذف: التقييم حُذف من قاعدة البيانات", count === 0);
    const nonAdmin = await (await b.newContext()).newPage();
    check("صفحة الإشراف: 404 لغير المشرف", (await nonAdmin.goto(`${BASE}/${env.ADMIN_PATH}/reviews`)).status() === 404);
    await admin.auth.admin.deleteUser(adminUser.id);
  }

  // ---------- 8) الجوال ----------
  const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  m.on("pageerror", (e) => errors.push("mobile: " + e.message));
  await m.goto(BASE + "/", { waitUntil: "networkidle" });
  check("الجوال: بدون تمرير أفقي", (await m.evaluate(() => document.documentElement.scrollWidth)) === 390);
  await m.locator("#reviews").scrollIntoViewIfNeeded();
  await m.locator("#reviews").screenshot({ path: shot("r3-mobile-reviews.png") });
  await m.locator("#partners").screenshot({ path: shot("r4-mobile-partners.png") });

  check("بدون أخطاء JavaScript", errors.length === 0, errors.join(" | "));
  await b.close();
  for (const r of results) console.log(r[0], r[1], r[0] === "FAIL" ? r[2] : "");
  const passed = results.filter((r) => r[0] === "PASS").length;
  console.log(`\n[${DEMO ? "demo" : "supabase"}] ${passed}/${results.length} passed`);
  if (passed !== results.length) process.exitCode = 1;
})().catch((e) => {
  for (const r of results) console.log(r[0], r[1], r[0] === "FAIL" ? r[2] : "");
  console.error(e);
  process.exit(1);
});
