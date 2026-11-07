/**
 * قنوات المنصة والشركاء — تظهر أسفل الصفحة الرئيسية.
 * الروابط من متغيرات البيئة حتى تُغيَّر بدون تعديل الكود؛ أي قناة بدون رابط لا تظهر.
 * لإضافة شريك جديد: أضف عنصراً هنا بنفس الشكل.
 */
export type PartnerIcon = "telegram" | "whatsapp" | "x" | "instagram" | "youtube" | "tiktok";

export interface Partner {
  id: string;
  name: string;
  description: string;
  href: string | undefined;
  icon: PartnerIcon;
  /** لون العلامة التجارية للأيقونة */
  color: string;
  /** الصفحة الرسمية للمنصة — تُستخدم للمعاينة فقط إذا لم يُضبط أي رابط */
  fallback: string;
}

export const PARTNERS: Partner[] = [
  {
    id: "telegram",
    name: "قناة تلجرام",
    description: "الأهداف والنتائج لحظة بلحظة",
    href: process.env.NEXT_PUBLIC_SOCIAL_TELEGRAM,
    icon: "telegram",
    color: "#29a9eb",
    fallback: "https://telegram.org",
  },
  {
    id: "whatsapp",
    name: "قناة واتساب",
    description: "ملخص يومي لأهم المباريات",
    href: process.env.NEXT_PUBLIC_SOCIAL_WHATSAPP,
    icon: "whatsapp",
    color: "#25d366",
    fallback: "https://www.whatsapp.com/channel",
  },
  {
    id: "x",
    name: "حسابنا على X",
    description: "أخبار عاجلة وتحليلات",
    href: process.env.NEXT_PUBLIC_SOCIAL_X,
    icon: "x",
    color: "#e7e9ea",
    fallback: "https://x.com",
  },
  {
    id: "instagram",
    name: "إنستغرام",
    description: "أفضل اللقطات والأهداف",
    href: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM,
    icon: "instagram",
    color: "#e1306c",
    fallback: "https://www.instagram.com",
  },
  {
    id: "youtube",
    name: "يوتيوب",
    description: "ملخصات المباريات بالفيديو",
    href: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE,
    icon: "youtube",
    color: "#ff0033",
    fallback: "https://www.youtube.com",
  },
  {
    id: "tiktok",
    name: "تيك توك",
    description: "مقاطع قصيرة من الملاعب",
    href: process.env.NEXT_PUBLIC_SOCIAL_TIKTOK,
    icon: "tiktok",
    color: "#25f4ee",
    fallback: "https://www.tiktok.com",
  },
];

const isHttps = (href: string | undefined): href is string => {
  if (!href) return false;
  try {
    return new URL(href).protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * القنوات المعروضة:
 * - إذا ضُبط رابط واحد على الأقل: تظهر القنوات المضبوطة فقط (روابط https).
 * - إذا لم يُضبط أي رابط (معاينة/عرض): تظهر كل القنوات بروابط الصفحات الرسمية للمنصات.
 */
export function activePartners(list: Partner[] = PARTNERS): (Partner & { href: string })[] {
  const configured = list.filter((p) => isHttps(p.href)) as (Partner & { href: string })[];
  if (configured.length) return configured;
  return list.map((p) => ({ ...p, href: p.fallback }));
}
