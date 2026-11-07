import "server-only";
import { cache } from "react";
import type { Profile } from "@/types/database";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/** ملف المستخدم الحالي (أو null للزائر). مُخزّن مؤقتاً لكل طلب. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_premium, premium_until")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
});

/** هل المستخدم مشترك في الباقة المميزة؟ (تُخفى الإعلانات عنه) */
export async function isPremiumUser(): Promise<boolean> {
  const profile = await getCurrentProfile();
  if (!profile?.is_premium) return false;
  return !profile.premium_until || new Date(profile.premium_until) > new Date();
}
