import type { Metadata } from "next";
import Link from "next/link";
import { CrownIcon } from "@/components/ui/icons";
import { getCurrentUser, isPremiumUser } from "@/lib/data/user";
import { isPaddleCheckoutConfigured } from "@/lib/paddle/config";
import { PREMIUM_PERKS } from "@/lib/premium";
import { PREMIUM_NAME, SITE_NAME, pageOpenGraph } from "@/lib/brand";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { toggleDemoPremium } from "./actions";
import { CheckoutButton } from "./CheckoutButton";

export const metadata: Metadata = {
  title: `${PREMIUM_NAME} — بدون إعلانات`,
  description: `اشترك في ${SITE_NAME} ${PREMIUM_NAME} مقابل 1.99$ شهرياً: بدون إعلانات، بث HD، وإلغاء في أي وقت.`,
  ...pageOpenGraph(
    `${PREMIUM_NAME} — بدون إعلانات`,
    `اشترك في ${SITE_NAME} ${PREMIUM_NAME} مقابل 1.99$ شهرياً: بدون إعلانات، بث HD، وإلغاء في أي وقت.`,
  ),
};

const COMPARISON: { label: string; free: string | boolean; premium: string | boolean }[] = [
  { label: "نتائج ومباريات مباشرة", free: true, premium: true },
  { label: "الأحداث والإحصائيات والتشكيلات", free: true, premium: true },
  { label: "البث المباشر", free: "حتى 480p", premium: "HD كاملة" },
  { label: "إعلان قبل البث", free: "5 ثوانٍ", premium: false },
  { label: "إعلانات في الصفحات", free: "نعم", premium: false },
];

const FAQ = [
  {
    q: "ما طرق الدفع المتاحة؟",
    a: "بطاقات فيزا وماستركارد، و Apple Pay و Google Pay و PayPal (حسب ما يتوفر في بلدك). الدفع يتم عبر Paddle بشكل آمن ولا نحتفظ ببيانات بطاقتك.",
  },
  {
    q: "هل السعر يشمل الضريبة؟",
    a: "Paddle يحسب ضريبة القيمة المضافة حسب بلدك تلقائياً ويعرض المبلغ النهائي قبل الدفع، ويرسل لك فاتورة رسمية بالبريد.",
  },
  {
    q: "كيف ألغي الاشتراك؟",
    a: "من صفحة «حسابي» ← «إدارة الاشتراك». يبقى اشتراكك فعالاً حتى نهاية الشهر المدفوع ولن يُجدد بعدها.",
  },
  {
    q: "متى يتفعّل الاشتراك؟",
    a: "فوراً بعد الدفع — خلال ثوانٍ تختفي الإعلانات وتُفتح جودة HD على كل أجهزتك المسجلة بنفس الحساب.",
  },
];

export default async function SubscribePage() {
  const [user, isPremium] = await Promise.all([getCurrentUser(), isPremiumUser()]);

  return (
    <div className="mx-auto max-w-4xl space-y-10 py-4">
      {/* العنوان */}
      <header className="text-center">
        <span className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-gold/15 text-gold ring-1 ring-gold/30">
          <CrownIcon width={28} height={28} />
        </span>
        <h1 className="mb-2 text-3xl font-extrabold sm:text-4xl">
          {SITE_NAME} <span className="text-gold">{PREMIUM_NAME}</span>
        </h1>
        <p className="text-muted">شاهد كل مباراة بدون إعلانات وبأعلى جودة — بأقل من سعر كوب قهوة.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_1.1fr] md:items-start">
        {/* بطاقة السعر */}
        <section className="rounded-2xl border border-gold/40 bg-gradient-to-b from-gold/10 to-surface p-6 shadow-xl shadow-gold/5">
          <p className="mb-1 text-sm font-semibold text-gold">الاشتراك الشهري</p>
          <p className="mb-5 flex items-baseline gap-2">
            <span dir="ltr" className="text-5xl font-extrabold">
              $1.99
            </span>
            <span className="text-muted">/ شهرياً</span>
          </p>

          <ul className="mb-6 space-y-3">
            {PREMIUM_PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-3">
                <span className="grid size-5 place-items-center rounded-full bg-brand/20 text-xs text-brand">✓</span>
                {perk}
              </li>
            ))}
          </ul>

          <SubscribeAction user={user} isPremium={isPremium} />

          <p className="mt-4 text-center text-xs text-muted">🔒 دفع آمن عبر Paddle · يتجدد شهرياً · ألغِ في أي وقت</p>
        </section>

        {/* المقارنة */}
        <section className="overflow-hidden rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <caption className="sr-only">مقارنة بين النسخة المجانية و {PREMIUM_NAME}</caption>
            <thead>
              <tr className="border-b border-border bg-surface-2 text-xs text-muted">
                <th scope="col" className="px-4 py-3 text-start font-semibold">الميزة</th>
                <th scope="col" className="px-3 py-3 font-semibold">مجاني</th>
                <th scope="col" className="px-3 py-3 font-bold text-gold">Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {COMPARISON.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="px-4 py-3 text-start font-medium">{row.label}</th>
                  <td className="px-3 py-3 text-center text-muted"><Cell value={row.free} /></td>
                  <td className="px-3 py-3 text-center font-semibold"><Cell value={row.premium} premium /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {/* أسئلة شائعة */}
      <section>
        <h2 className="mb-4 text-xl font-extrabold">أسئلة شائعة</h2>
        <div className="space-y-2">
          {FAQ.map((item) => (
            <details key={item.q} className="group rounded-xl border border-border bg-surface px-4 py-3 open:bg-surface-2/40">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                {item.q}
                <span className="text-muted transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function Cell({ value, premium }: { value: string | boolean; premium?: boolean }) {
  if (value === true) return <span className={premium ? "text-brand" : ""} aria-label="متاح">✓</span>;
  if (value === false) return <span className="text-brand" aria-label="لا يوجد">—</span>;
  return <>{value}</>;
}

async function SubscribeAction({ user, isPremium }: { user: { id: string; email: string | null } | null; isPremium: boolean }) {
  // وضع العرض: بدون Supabase نسمح بتجربة Premium عبر كوكي محلي
  if (!isSupabaseConfigured) {
    return (
      <form action={toggleDemoPremium} className="space-y-2">
        <input type="hidden" name="enable" value={isPremium ? "0" : "1"} />
        <button
          type="submit"
          className="w-full rounded-xl bg-gold py-3.5 text-lg font-extrabold text-black transition hover:brightness-110"
        >
          {isPremium ? "إيقاف Premium التجريبي" : "جرّب Premium (وضع العرض)"}
        </button>
        <p className="text-center text-xs text-gold">
          وضع العرض: لا يوجد دفع حقيقي. اربط Supabase و Paddle لتفعيل الاشتراك الفعلي.
        </p>
      </form>
    );
  }

  if (isPremium) {
    return (
      <div className="space-y-3 text-center">
        <p className="rounded-xl bg-brand/15 py-3 font-bold text-brand ring-1 ring-brand/30">✓ أنت مشترك في Premium</p>
        <Link href="/account" className="block text-sm font-semibold text-muted hover:text-fg">
          إدارة الاشتراك ←
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login?next=/subscribe"
        className="block w-full rounded-xl bg-gold py-3.5 text-center text-lg font-extrabold text-black transition hover:brightness-110"
      >
        سجّل الدخول للاشتراك
      </Link>
    );
  }

  if (!isPaddleCheckoutConfigured) {
    return (
      <p className="rounded-xl bg-surface-2 p-3 text-center text-sm text-muted ring-1 ring-border">
        الدفع غير مُفعّل بعد. (أضف مفاتيح Paddle في إعدادات الموقع)
      </p>
    );
  }

  return <CheckoutButton userId={user.id} email={user.email} />;
}
