import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CrownIcon } from "@/components/ui/icons";
import { getAdminSlug } from "@/lib/admin/path";
import { PREMIUM_NAME } from "@/lib/brand";
import { getCurrentProfile, getCurrentUser, getLatestSubscription, isPremiumUser } from "@/lib/data/user";
import { APP_TIMEZONE } from "@/lib/utils/date";
import { openBillingPortal } from "../subscribe/actions";

export const metadata: Metadata = { title: "حسابي", robots: { index: false } };

const dateFmt = new Intl.DateTimeFormat("ar-u-nu-latn", { timeZone: APP_TIMEZONE, dateStyle: "long" });

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  active: { text: "فعّال", className: "bg-brand/15 text-brand" },
  trialing: { text: "فترة تجريبية", className: "bg-brand/15 text-brand" },
  past_due: { text: "فشل الدفع — يرجى تحديث البطاقة", className: "bg-gold/15 text-gold" },
  paused: { text: "متوقف مؤقتاً", className: "bg-surface-2 text-muted" },
  canceled: { text: "ملغى", className: "bg-surface-2 text-muted" },
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  const [{ error }, profile, isPremium, sub] = await Promise.all([
    searchParams,
    getCurrentProfile(),
    isPremiumUser(),
    getLatestSubscription(),
  ]);
  const status = sub ? STATUS_LABEL[sub.status] : null;
  // رابط لوحة التحكم يظهر للمشرف فقط — المسار السري لا يُرسل لغيره أبداً
  const adminSlug = profile?.role === "admin" ? getAdminSlug() : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <h1 className="text-2xl font-extrabold">حسابي</h1>

      {error === "portal" && (
        <p role="alert" className="rounded-lg bg-live/10 px-4 py-3 text-sm text-live ring-1 ring-live/30">
          تعذّر فتح صفحة إدارة الاشتراك. حاول مرة أخرى بعد قليل.
        </p>
      )}

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-bold text-muted">البيانات</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted">البريد</dt>
          <dd dir="ltr" className="text-end font-semibold">{user.email}</dd>
          {profile?.full_name && (
            <>
              <dt className="text-muted">الاسم</dt>
              <dd className="font-semibold">{profile.full_name}</dd>
            </>
          )}
        </dl>
      </section>

      <section className={`rounded-2xl border p-5 ${isPremium ? "border-gold/40 bg-gold/5" : "border-border bg-surface"}`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-extrabold">
            <CrownIcon className={isPremium ? "text-gold" : "text-muted"} />
            {isPremium ? `اشتراك ${PREMIUM_NAME}` : "النسخة المجانية"}
          </h2>
          {status && <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.className}`}>{status.text}</span>}
        </div>

        {sub && sub.current_period_end && sub.status !== "canceled" && (
          <p className="mb-4 text-sm text-muted">
            {sub.cancel_at_period_end ? "ينتهي اشتراكك ولن يتجدد في " : "التجديد القادم: "}
            <span className="font-semibold text-fg">{dateFmt.format(new Date(sub.current_period_end))}</span>
          </p>
        )}

        {sub ? (
          <form action={openBillingPortal}>
            <button type="submit" className="rounded-lg bg-surface-2 px-4 py-2.5 text-sm font-bold ring-1 ring-border transition hover:bg-border">
              إدارة الاشتراك والفواتير
            </button>
            <p className="mt-2 text-xs text-muted">الإلغاء، تغيير وسيلة الدفع، وتحميل الفواتير عبر Paddle.</p>
          </form>
        ) : (
          !isPremium && (
            <Link href="/subscribe" className="inline-block rounded-lg bg-gold px-5 py-2.5 text-sm font-extrabold text-black">
              اشترك بـ 1.99$ شهرياً
            </Link>
          )
        )}
      </section>

      {adminSlug && (
        <Link
          href={`/${adminSlug}`}
          rel="noreferrer"
          className="flex items-center justify-between rounded-2xl border border-brand/40 bg-brand/5 p-5 font-bold hover:bg-brand/10"
        >
          🛠️ لوحة التحكم
          <span className="text-sm text-muted">←</span>
        </Link>
      )}

      <form action="/auth/signout" method="post">
        <button type="submit" className="text-sm font-semibold text-live hover:underline">
          تسجيل الخروج
        </button>
      </form>
    </div>
  );
}
