"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const POLL_MS = 2000;
const TIMEOUT_MS = 60_000;

/**
 * بعد الدفع ترسل Paddle الـ webhook خلال ثوانٍ — ننتظر هنا حتى تتحدث حالة الحساب.
 */
export function SubscriptionActivation({ initiallyPremium }: { initiallyPremium: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"waiting" | "active" | "slow">(initiallyPremium ? "active" : "waiting");

  useEffect(() => {
    if (state !== "waiting") return;
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch("/api/subscription/status", { cache: "no-store" });
        const json = (await res.json()) as { isPremium: boolean };
        if (json.isPremium) {
          setState("active");
          router.refresh(); // تحديث الهيدر وإخفاء الإعلانات
          return;
        }
      } catch {
        // نتجاهل أخطاء الشبكة المؤقتة ونعيد المحاولة
      }
      if (Date.now() - started > TIMEOUT_MS) setState("slow");
      else timer = setTimeout(poll, POLL_MS);
    };
    poll();
    return () => clearTimeout(timer);
  }, [state, router]);

  if (state === "active") {
    return (
      <div className="space-y-4">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-brand/20 text-3xl text-brand">✓</div>
        <h1 className="text-2xl font-extrabold">مرحباً بك في Premium!</h1>
        <p className="text-muted">تم تفعيل اشتراكك. استمتع بالمباريات بدون إعلانات وبجودة HD.</p>
        <Link href="/" className="inline-block rounded-xl bg-brand px-6 py-3 font-bold text-brand-fg">
          شاهد المباريات الآن
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4" aria-live="polite">
      {state === "waiting" ? (
        <>
          <span className="mx-auto block size-12 animate-spin rounded-full border-4 border-border border-t-gold" />
          <h1 className="text-2xl font-extrabold">تم الدفع بنجاح 🎉</h1>
          <p className="text-muted">جارٍ تفعيل اشتراكك… يستغرق ذلك بضع ثوانٍ.</p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-extrabold">تم استلام الدفع</h1>
          <p className="text-muted">
            التفعيل يأخذ وقتاً أطول من المعتاد. سيتفعّل اشتراكك تلقائياً خلال دقائق — لا حاجة للدفع مرة أخرى.
          </p>
          <button type="button" onClick={() => setState("waiting")} className="font-semibold text-brand">
            تحقّق مرة أخرى
          </button>
        </>
      )}
    </div>
  );
}
