/** الاسم التجاري للمنصة — مصدر واحد لكل الواجهات والـ metadata */
export const SITE_NAME = "GoalMood plus";
export const SITE_TAGLINE = "نتائج ومباريات مباشرة";
export const SITE_DESCRIPTION = "نتائج المباريات المباشرة، جدول المباريات اليومي، الإحصائيات والبث المباشر.";
/** اسم باقة الاشتراك */
export const PREMIUM_NAME = "Premium";

/**
 * OpenGraph لصفحة محددة. Next.js يستبدل openGraph الخاص بالجذر بالكامل (دمج سطحي)،
 * لذلك نعيد تضمين اسم الموقع واللغة هنا.
 */
export function pageOpenGraph(title: string, description: string) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  return {
    openGraph: { type: "website" as const, siteName: SITE_NAME, locale: "ar_AR", title: fullTitle, description },
    twitter: { card: "summary" as const, title: fullTitle, description },
  };
}
