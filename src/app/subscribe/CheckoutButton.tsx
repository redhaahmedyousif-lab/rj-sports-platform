"use client";

import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { useEffect, useRef, useState } from "react";
import { paddleClientToken, paddleEnv, paddlePriceId } from "@/lib/paddle/config";

/**
 * يفتح نافذة الدفع من Paddle (Overlay) فوق الصفحة.
 * user_id يُمرَّر في customData فيصل مع الاشتراك في الـ webhook لربطه بالحساب.
 */
export function CheckoutButton({ userId, email }: { userId: string; email: string | null }) {
  const paddleRef = useRef<Paddle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // الزر معطّل حتى يكتمل تحميل JavaScript — حتى لا يضغط المستخدم دون استجابة
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const openCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      paddleRef.current ??=
        (await initializePaddle({
          environment: paddleEnv,
          token: paddleClientToken,
          eventCallback: (event) => {
            if (event.name === "checkout.closed") setLoading(false);
          },
        })) ?? null;
      if (!paddleRef.current) throw new Error("Paddle failed to load");

      paddleRef.current.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: 1 }],
        customer: email ? { email } : undefined,
        customData: { user_id: userId },
        settings: {
          displayMode: "overlay",
          theme: "dark",
          locale: "ar",
          allowLogout: false,
          successUrl: `${window.location.origin}/subscribe/success`,
        },
      });
    } catch (e) {
      console.error(e);
      setError("تعذّر فتح صفحة الدفع. تحقق من اتصالك أو عطّل مانع الإعلانات ثم أعد المحاولة.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={openCheckout}
        disabled={!ready || loading}
        className="w-full rounded-xl bg-gold py-3.5 text-lg font-extrabold text-black transition hover:brightness-110 disabled:opacity-70"
      >
        {loading ? "جارٍ فتح الدفع الآمن…" : "اشترك الآن — 1.99$ / شهرياً"}
      </button>
      {error && (
        <p role="alert" className="text-center text-sm text-live">
          {error}
        </p>
      )}
    </div>
  );
}
