"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * يعيد رسم الصفحة عند أي تغيير في الجداول المحددة (Supabase Realtime)،
 * مع تحديث دوري احتياطي — يُستخدم في صفحات لوحة التحكم.
 */
export function RealtimeRefresh({ tables, fallbackMs = 30_000 }: { tables: string[]; fallbackMs?: number }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = tables.join(",");

  useEffect(() => {
    const refresh = () => {
      if (timer.current) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        router.refresh();
      }, 400);
    };
    const supabase = createClient();
    let channel = supabase.channel(`admin:${key}`);
    for (const table of key.split(",")) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
    }
    channel.subscribe();
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, fallbackMs);
    return () => {
      clearInterval(poll);
      if (timer.current) clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
  }, [key, fallbackMs, router]);

  return null;
}
