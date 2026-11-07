"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

/**
 * تحديث صفحة المباراة لحظياً:
 * - مع Supabase: اشتراك Realtime في صف المباراة وجدول الأحداث → تحديث فوري عند أي تغيير.
 * - بدونها (بيانات تجريبية): تحديث دوري كل 30 ثانية أثناء المباراة.
 * التحديث عبر router.refresh() يعيد رسم Server Components مع الحفاظ على حالة المشغل والتبويب.
 */
export function LiveMatchUpdates({
  matchId,
  active,
  kickoffAt,
}: {
  matchId: string;
  /** المباراة جارية */
  active: boolean;
  kickoffAt: string;
}) {
  const router = useRouter();
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  // تجميع التحديثات المتتالية في تحديث واحد
  const refresh = useCallback(() => {
    if (pending.current) return;
    pending.current = setTimeout(() => {
      pending.current = null;
      router.refresh();
    }, 500);
  }, [router]);

  // Realtime
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`match:${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, () =>
        refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_events", filter: `match_id=eq.${matchId}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [matchId, refresh]);

  // بدون Supabase: تحديث دوري أثناء المباراة
  useEffect(() => {
    if (!active || isSupabaseConfigured) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 30_000);
    return () => clearInterval(id);
  }, [active, refresh]);

  // تحديث تلقائي لحظة انطلاق المباراة لإظهار المشغل
  useEffect(() => {
    const ms = new Date(kickoffAt).getTime() - Date.now();
    if (ms <= 0 || ms > 24 * 3600_000) return;
    const id = setTimeout(() => refresh(), ms + 2000);
    return () => clearTimeout(id);
  }, [kickoffAt, refresh]);

  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
    },
    [],
  );

  return null;
}
