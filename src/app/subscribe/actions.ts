"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_PREMIUM_COOKIE, getCurrentProfile, getLatestSubscription } from "@/lib/data/user";
import { createCustomerPortalUrl } from "@/lib/paddle/api";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/** وضع العرض فقط (بدون Supabase): تفعيل/إلغاء Premium تجريبياً لمعاينة التجربة */
export async function toggleDemoPremium(formData: FormData) {
  if (isSupabaseConfigured) return; // لا يعمل أبداً مع قاعدة بيانات حقيقية
  const store = await cookies();
  if (formData.get("enable") === "1") {
    store.set(DEMO_PREMIUM_COOKIE, "1", { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  } else {
    store.delete(DEMO_PREMIUM_COOKIE);
  }
  redirect("/subscribe");
}

/** فتح بوابة Paddle لإدارة الاشتراك (إلغاء، تغيير وسيلة الدفع، الفواتير) */
export async function openBillingPortal() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/account");

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("paddle_customer_id").eq("id", profile.id).maybeSingle();
  const customerId = (data as { paddle_customer_id: string | null } | null)?.paddle_customer_id;
  if (!customerId) redirect("/subscribe");

  const sub = await getLatestSubscription();
  let url: string;
  try {
    url = await createCustomerPortalUrl(customerId, sub ? [sub.id] : []);
  } catch (error) {
    console.error("[billing portal]", error);
    redirect("/account?error=portal");
  }
  redirect(url);
}
