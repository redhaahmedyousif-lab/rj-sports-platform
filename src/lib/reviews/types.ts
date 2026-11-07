/** التفاعلات المتاحة تحت كل تقييم */
export const REACTION_EMOJIS = ["👍", "❤️", "🔥", "😮", "😂"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

/** شارة صاحب التقييم — تُحدَّد في الخادم وقت الإرسال (لا يختارها المستخدم) */
export type ReviewBadge = "guest" | "member" | "premium";

/** التقييم كما يُرسل للواجهة (بدون أي معرّفات خاصة بالمرسل) */
export interface ReviewDTO {
  id: string;
  name: string;
  rating: number;
  body: string;
  badge: ReviewBadge;
  createdAt: string;
  /** "منذ يوم" — يُحسب في الخادم لتفادي اختلاف النص بين الخادم والمتصفح */
  timeAgo: string;
  reactions: Partial<Record<ReactionEmoji, number>>;
  /** تفاعلات الزائر الحالي */
  mine: ReactionEmoji[];
}

export interface ReviewSummary {
  average: number;
  total: number;
  /** عدد التقييمات لكل نجمة: [5,4,3,2,1] */
  distribution: [number, number, number, number, number];
}

export interface ReviewPage {
  reviews: ReviewDTO[];
  hasMore: boolean;
}

export const REVIEWS_PAGE_SIZE = 6;
export const REVIEW_BODY_MAX = 500;
export const REVIEW_BODY_MIN = 5;
export const REVIEW_NAME_MAX = 40;

export function isReactionEmoji(value: unknown): value is ReactionEmoji {
  return typeof value === "string" && (REACTION_EMOJIS as readonly string[]).includes(value);
}
