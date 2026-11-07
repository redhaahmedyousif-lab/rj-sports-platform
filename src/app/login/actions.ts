"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl, safeNextPath } from "@/lib/utils/url";

export interface LoginState {
  step: "email" | "code";
  email?: string;
  error?: string;
  /** وقت الإرسال — لتعطيل "إعادة الإرسال" مؤقتاً */
  sentAt?: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function translateError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("rate limit") || m.includes("security purposes")) return "طلبات كثيرة. انتظر دقيقة ثم أعد المحاولة.";
  if (m.includes("expired") || m.includes("invalid")) return "الرمز غير صحيح أو انتهت صلاحيته.";
  return "حدث خطأ غير متوقع. حاول مرة أخرى.";
}

/** الخطوة 1: إرسال رمز الدخول + الرابط السحري إلى البريد (ينشئ الحساب تلقائياً إن لم يوجد) */
export async function sendLoginCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isSupabaseConfigured) return { step: "email", error: "Supabase غير مضبوط بعد." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeNextPath(formData.get("next"));
  if (!EMAIL_RE.test(email)) return { step: "email", email, error: "أدخل بريداً إلكترونياً صحيحاً." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${await getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { step: "email", email, error: translateError(error.message) };

  return { step: "code", email, sentAt: Date.now() };
}

/** الخطوة 2: التحقق من الرمز المكوّن من 6 أرقام */
export async function verifyLoginCode(prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = prev.email ?? "";
  const token = String(formData.get("token") ?? "").replace(/\D/g, "");
  const next = safeNextPath(formData.get("next"));
  if (token.length !== 6) return { ...prev, error: "الرمز يتكون من 6 أرقام." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { ...prev, error: translateError(error.message) };

  redirect(next);
}

/** تسجيل الدخول بـ Google (يتطلب تفعيل المزوّد في Supabase) */
export async function signInWithGoogle(formData: FormData) {
  const next = safeNextPath(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect(`/login?error=oauth&next=${encodeURIComponent(next)}`);
  redirect(data.url);
}
