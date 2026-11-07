import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils/url";

/** وجهة رابط البريد السحري وتسجيل الدخول بـ Google: تبادل الكود بجلسة ثم التوجيه */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
    console.error("[auth callback]", error.message);
  }

  const url = new URL("/login", origin);
  url.searchParams.set("error", "link");
  url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}
