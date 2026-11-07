import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data/user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { safeNextPath } from "@/lib/utils/url";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "تسجيل الدخول", robots: { index: false } };

const ERRORS: Record<string, string> = {
  link: "رابط الدخول غير صالح أو انتهت صلاحيته. اطلب رمزاً جديداً.",
  oauth: "تعذّر تسجيل الدخول بـ Google. حاول مرة أخرى.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (await getCurrentUser()) redirect(next);

  return (
    <div className="mx-auto max-w-md py-6">
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <h1 className="mb-1 text-2xl font-extrabold">تسجيل الدخول</h1>
        <p className="mb-6 text-sm text-muted">ادخل أو أنشئ حساباً جديداً بخطوة واحدة.</p>

        {params.error && ERRORS[params.error] && (
          <p role="alert" className="mb-4 rounded-lg bg-live/10 px-3 py-2 text-sm text-live ring-1 ring-live/30">
            {ERRORS[params.error]}
          </p>
        )}

        {isSupabaseConfigured ? (
          <LoginForm next={next} googleEnabled={process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true"} />
        ) : (
          <p className="rounded-lg bg-gold/10 p-4 text-sm text-gold ring-1 ring-gold/30">
            الموقع يعمل حالياً بالبيانات التجريبية. أضف مفاتيح Supabase في <code dir="ltr">.env.local</code> لتفعيل تسجيل الدخول.
          </p>
        )}

        <p className="mt-6 text-center text-xs text-muted">
          بالمتابعة أنت توافق على شروط الاستخدام وسياسة الخصوصية.{" "}
          <Link href="/" className="text-fg hover:underline">
            العودة للرئيسية
          </Link>
        </p>
      </div>
    </div>
  );
}
