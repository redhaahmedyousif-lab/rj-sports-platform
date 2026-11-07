"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * يحدّث بيانات الصفحة تلقائياً كل فترة عند وجود مباريات مباشرة.
 * router.refresh() يعيد جلب Server Components فقط دون إعادة تحميل الصفحة.
 * لاحقاً: يمكن استبداله بـ Supabase Realtime للتحديث اللحظي.
 */
export function LiveRefresher({ enabled, intervalMs = 30_000 }: { enabled: boolean; intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs, router]);

  return null;
}
