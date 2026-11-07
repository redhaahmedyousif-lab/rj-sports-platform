import "server-only";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/data/user";
import { getAdminSlug } from "./path";

/**
 * طبقة حماية ثانية (بعد proxy.ts): تُستدعى في layout لوحة التحكم وفي كل Server Action.
 * أي طلب من غير مشرف → 404 (لا نكشف وجود الصفحة أو الإجراء).
 * الطبقة الثالثة: سياسات RLS في قاعدة البيانات (الكتابة للمشرفين فقط).
 */
export async function requireAdmin() {
  const slug = getAdminSlug();
  const profile = await getCurrentProfile();
  if (!slug || profile?.role !== "admin") notFound();
  return { profile, basePath: `/${slug}` };
}
