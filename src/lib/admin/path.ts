/**
 * مسار لوحة التحكم:
 * - المسار العام سري ويُضبط من متغير البيئة ADMIN_PATH (لا يبدأ بـ NEXT_PUBLIC فلا يصل للمتصفح).
 * - الصفحات موجودة فعلياً تحت INTERNAL_ADMIN_PREFIX، ولا يمكن الوصول لها مباشرة:
 *   proxy.ts يُرجع 404 لأي طلب مباشر، ويعيد التوجيه الداخلي (rewrite) فقط من المسار السري وللمشرفين فقط.
 */
export const INTERNAL_ADMIN_PREFIX = "/admin-console";

/** مسارات مشهورة لا نقبلها كمسار سري */
const FORBIDDEN_SLUGS = new Set(["admin", "administrator", "dashboard", "manage", "panel", "cp", "backend", "wp-admin", "admin-console"]);

/** المسار السري: 12 حرفاً على الأقل من a-z و 0-9 و "-" */
export function isValidAdminSlug(slug: string | undefined | null): slug is string {
  return typeof slug === "string" && /^[a-z0-9][a-z0-9-]{11,63}$/.test(slug) && !FORBIDDEN_SLUGS.has(slug);
}

/** المسار السري المضبوط أو null (لوحة التحكم معطّلة بالكامل إذا لم يُضبط أو كان ضعيفاً) */
export function getAdminSlug(): string | null {
  const slug = process.env.ADMIN_PATH?.trim().replace(/^\/+|\/+$/g, "").toLowerCase();
  return isValidAdminSlug(slug) ? slug : null;
}

export type AdminRoute =
  | { kind: "none" }
  | { kind: "internal" } // محاولة وصول مباشر للمسار الداخلي
  | { kind: "admin"; internalPath: string };

/** تصنيف المسار المطلوب: عادي / داخلي محظور / لوحة التحكم */
export function matchAdminRoute(pathname: string, slug: string | null): AdminRoute {
  const lower = pathname.toLowerCase();
  if (lower === INTERNAL_ADMIN_PREFIX || lower.startsWith(`${INTERNAL_ADMIN_PREFIX}/`)) return { kind: "internal" };
  if (!slug) return { kind: "none" };
  const base = `/${slug}`;
  if (lower === base || lower.startsWith(`${base}/`)) {
    return { kind: "admin", internalPath: INTERNAL_ADMIN_PREFIX + pathname.slice(base.length) };
  }
  return { kind: "none" };
}
