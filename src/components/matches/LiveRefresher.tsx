"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

/**
 * تحديث الصفحة الرئيسية:
 * - مع Supabase: Realtime — أي تغيير يجريه المشرف (نتيجة، دقيقة، حالة) يظهر فوراً.
 * - تحديث دوري احتياطي كل 30 ثانية أثناء وجود مباريات مباشرة (وفي وضع البيانات التجريبية).
 * router.refresh() يعيد جلب Server Components فقط دون إعادة تحميل الصفحة.
 */
export function LiveRefresher({ enabled, intervalMs = 30_000 }: { enabled: boolean; intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let pending: ReturnType<typeof setTimeout> | null = null;
    const supabase = createClient();
    const channel = supabase
      .channel("home:matches")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        if (pending) return;
        pending = setTimeout(() => {
          pending = null;
          router.refresh();
        }, 500);
      })
      .subscribe();
    return () => {
      if (pending) clearTimeout(pending);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs, router]);

  return null;
}
