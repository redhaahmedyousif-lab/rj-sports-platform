import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Profile } from "@/types/database";
import type { StoredSubscription } from "@/lib/paddle/sync";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/** كوكي "Premium التجريبي" — يعمل فقط عندما لا تكون Supabase مضبوطة (وضع العرض) */
export const DEMO_PREMIUM_COOKIE = "rj_demo_premium";

export interface CurrentUser {
  id: string;
  email: string | null;
}

/** المستخدم الحالي من جلسة Supabase (أو null للزائر). مُخزّن لكل طلب. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
});

/** ملف المستخدم الحالي */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_premium, premium_until")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Profile | null) ?? null;
});

/** هل المستخدم مشترك في الباقة المميزة؟ (تُخفى الإعلانات وتُفتح جودة HD) */
export const isPremiumUser = cache(async (): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    return (await cookies()).get(DEMO_PREMIUM_COOKIE)?.value === "1";
  }
  const profile = await getCurrentProfile();
  if (!profile?.is_premium) return false;
  return !profile.premium_until || new Date(profile.premium_until) > new Date();
});

/** أحدث اشتراك للمستخدم (لصفحة الحساب) */
export async function getLatestSubscription(): Promise<StoredSubscription | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as StoredSubscription | null) ?? null;
}
