import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminSlug, matchAdminRoute } from "@/lib/admin/path";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

/** صفحات تتطلب تسجيل الدخول */
const PROTECTED = ["/account"];

/** مسار غير موجود — إعادة التوجيه الداخلي إليه تعرض صفحة 404 الحقيقية بنفس الشكل والحالة */
const NOT_FOUND_PATH = "/__not-found__";

function notFound(request: NextRequest) {
  const res = NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
  res.headers.set("Cache-Control", "no-store");
  return res;
}

/**
 * يُستدعى من proxy.ts لكل طلب:
 * 1. يجدد جلسة Supabase (توكن منتهي → جديد في الكوكيز)
 * 2. يعيد توجيه الزائر من الصفحات المحمية إلى صفحة الدخول
 * 3. يحمي لوحة التحكم: 404 لكل من ليس مشرفاً، ولا وصول مباشر للمسار الداخلي أبداً
 */
export async function updateSession(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const adminRoute = matchAdminRoute(pathname, isSupabaseConfigured ? getAdminSlug() : null);

  // المسار الداخلي للوحة التحكم لا يُفتح مباشرة أبداً — لا يوجد له رابط عام
  if (adminRoute.kind === "internal") return notFound(request);

  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // مهم: لا تضع أي كود بين إنشاء العميل وهذا السطر
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  if (adminRoute.kind === "admin") {
    // الزائر والمستخدم العادي يحصلان على نفس 404 — لا يمكن إثبات وجود الصفحة
    if (!userId) return notFound(request);
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (profile?.role !== "admin") return notFound(request);

    const rewrite = NextResponse.rewrite(new URL(adminRoute.internalPath + search, request.url), { request });
    response.cookies.getAll().forEach((cookie) => rewrite.cookies.set(cookie));
    rewrite.headers.set("X-Robots-Tag", "noindex, nofollow");
    rewrite.headers.set("Cache-Control", "no-store");
    rewrite.headers.set("Referrer-Policy", "no-referrer"); // لا يتسرب المسار السري لمواقع أخرى
    return rewrite;
  }

  if (!userId && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return response;
}
