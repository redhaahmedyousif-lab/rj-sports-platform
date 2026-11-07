import type { ReviewRecord } from "./store";
import type { ReactionEmoji, ReviewBadge } from "./types";

/** [الاسم, التقييم, الشارة, منذ كم ساعة, النص, التفاعلات] */
type Seed = [string, number, ReviewBadge, number, string, Partial<Record<ReactionEmoji, number>>];

const SEEDS: Seed[] = [
  ["أبو فهد", 5, "premium", 3, "أفضل تطبيق نتائج جربته، التحديث لحظي والبث بدون تقطيع. يستاهل الاشتراك 👌", { "👍": 24, "❤️": 11, "🔥": 7 }],
  ["سارة المطيري", 5, "member", 20, "التصميم الداكن مريح للعين والإحصائيات مرتبة جداً. أتمنى تضيفون الدوري الإيطالي.", { "👍": 15, "❤️": 9 }],
  ["محمد الكعبي", 4, "guest", 26, "ممتاز بشكل عام، لكن ودي يكون فيه إشعار عند تسجيل الأهداف.", { "👍": 8, "😮": 2 }],
  ["Hassan", 5, "premium", 48, "Smooth streaming and the lineups view is clean. Great job!", { "👍": 6, "🔥": 4 }],
  ["نوف", 5, "member", 52, "صفحة المباراة فيها كل شيء: الأحداث والتشكيلة والإحصائيات. شكراً لكم ❤️", { "❤️": 13, "👍": 5 }],
  ["عبدالله", 3, "guest", 74, "التطبيق حلو بس الإعلان قبل البث مزعج شوي، اشتركت وارتحت 😂", { "😂": 18, "👍": 3 }],
  ["ريم الحربي", 5, "premium", 100, "بأقل من دولارين بالشهر وبدون إعلانات؟ صفقة ممتازة.", { "🔥": 9, "👍": 7 }],
  ["خالد", 4, "member", 150, "سريع جداً على الجوال، وأحب شريط التواريخ. ينقصه بس قسم الأخبار.", { "👍": 4 }],
  ["يوسف البلوشي", 5, "guest", 200, "تابعت الكلاسيكو كامل بجودة HD بدون أي مشكلة 🔥", { "🔥": 21, "😮": 3, "❤️": 2 }],
  ["مريم", 4, "member", 260, "واجهة عربية بالكامل وواضحة، أخيراً تطبيق يحترم المستخدم العربي.", { "❤️": 10 }],
  ["Omar", 5, "guest", 340, "Best live scores site in Arabic. Love the stats tab.", { "👍": 2 }],
  ["فيصل الشمري", 4, "premium", 420, "ممتاز، وأتمنى إضافة إمكانية متابعة فريقي المفضل.", { "👍": 5, "❤️": 1 }],
];

/** عدد ثابت من المتفاعلين الوهميين (ليكون العدد صحيحاً عند إضافة/إزالة تفاعل الزائر) */
function seededReactors(count: number, prefix: string) {
  return new Set(Array.from({ length: count }, (_, i) => `${prefix}-${i}`));
}

export function mockSeedReviews(): {
  reviews: ReviewRecord[];
  reactions: Map<string, Map<ReactionEmoji, Set<string>>>;
} {
  const now = Date.now();
  const reactions = new Map<string, Map<ReactionEmoji, Set<string>>>();
  const reviews = SEEDS.map(([name, rating, badge, hoursAgo, body, rx], i) => {
    const id = `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
    reactions.set(
      id,
      new Map(Object.entries(rx).map(([emoji, n]) => [emoji as ReactionEmoji, seededReactors(n!, `seed-${i}-${emoji}`)])),
    );
    return {
      id,
      name,
      rating,
      badge,
      body,
      created_at: new Date(now - hoursAgo * 3600_000).toISOString(),
      reviewer_id: `seed-${i}`,
      ip_hash: null,
      user_id: null,
    } satisfies ReviewRecord;
  });
  return { reviews, reactions };
}
