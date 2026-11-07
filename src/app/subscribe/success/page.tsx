import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPremiumUser } from "@/lib/data/user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SubscriptionActivation } from "./SubscriptionActivation";

export const metadata: Metadata = { title: "تفعيل الاشتراك", robots: { index: false } };

export default async function SubscribeSuccessPage() {
  if (isSupabaseConfigured && !(await getCurrentUser())) redirect("/login?next=/subscribe/success");
  const isPremium = await isPremiumUser();

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
      <SubscriptionActivation initiallyPremium={isPremium} />
    </div>
  );
}
