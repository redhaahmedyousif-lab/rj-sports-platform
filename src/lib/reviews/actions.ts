"use server";

import { refresh } from "next/cache";
import { getCurrentUser, isPremiumUser } from "@/lib/data/user";
import { ensureReactorId, hashedIp, readReactorId, toDTOs } from "./service";
import { getReviewStore } from "./store";
import { REVIEWS_PAGE_SIZE, isReactionEmoji, type ReactionEmoji, type ReviewBadge, type ReviewDTO, type ReviewPage } from "./types";
import { parseReviewForm, type ReviewFieldErrors } from "./validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** حدود الإرسال: تقييم واحد كل دقيقتين، و 5 تقييمات يومياً كحد أقصى (لكل متصفح أو شبكة) */
const SHORT_WINDOW_MS = 2 * 60_000;
const DAILY_LIMIT = 5;

export interface SubmitReviewState {
  ok?: boolean;
  message?: string;
  errors?: ReviewFieldErrors;
  review?: ReviewDTO;
  /** يتغير مع كل إرسال ناجح — ليعرف النموذج متى يُفرَّغ */
  nonce?: number;
}

export async function submitReview(_prev: SubmitReviewState, fd: FormData): Promise<SubmitReviewState> {
  const store = getReviewStore();
  if (!store) return { ok: false, message: "التقييمات غير متاحة حالياً." };

  const parsed = parseReviewForm(fd);
  if (!parsed.ok) {
    // البوت يرى نجاحاً وهمياً حتى لا يعدّل سلوكه — ولا يُحفظ شيء
    if (parsed.spam) return { ok: true, message: "شكراً لك! تم نشر تقييمك.", nonce: Date.now() };
    return { ok: false, errors: parsed.errors, message: "راجع الحقول المظللة." };
  }

  const [reviewerId, ipHash] = await Promise.all([ensureReactorId(), hashedIp()]);
  try {
    const now = Date.now();
    const [recent, today] = await Promise.all([
      store.recentCount(reviewerId, ipHash, new Date(now - SHORT_WINDOW_MS)),
      store.recentCount(reviewerId, ipHash, new Date(now - 86_400_000)),
    ]);
    if (recent > 0) return { ok: false, message: "أرسلت تقييماً قبل قليل. انتظر دقيقتين ثم حاول مرة أخرى." };
    if (today >= DAILY_LIMIT) return { ok: false, message: "وصلت للحد اليومي للتقييمات. شكراً لمشاركتك!" };

    // الشارة تُحدد من الجلسة في الخادم — لا يمكن للمستخدم ادّعاؤها
    const [user, premium] = await Promise.all([getCurrentUser(), isPremiumUser()]);
    const badge: ReviewBadge = premium ? "premium" : user ? "member" : "guest";

    const record = await store.create({
      ...parsed.data,
      badge,
      reviewer_id: reviewerId,
      ip_hash: ipHash,
      user_id: user?.id ?? null,
    });
    const [review] = await toDTOs(store, [record], reviewerId);
    refresh(); // تحديث متوسط التقييم وعدد التقييمات
    return { ok: true, message: "شكراً لك! تم نشر تقييمك.", review, nonce: Date.now() };
  } catch (error) {
    console.error("[reviews] submit failed", error);
    return { ok: false, message: "تعذّر إرسال التقييم. حاول مرة أخرى." };
  }
}

export interface ReactionResult {
  ok: boolean;
  counts?: Partial<Record<ReactionEmoji, number>>;
  mine?: ReactionEmoji[];
}

export async function toggleReviewReaction(reviewId: string, emoji: string): Promise<ReactionResult> {
  const store = getReviewStore();
  if (!store || !UUID.test(reviewId) || !isReactionEmoji(emoji)) return { ok: false };
  try {
    const reactorId = await ensureReactorId();
    const changed = await store.toggleReaction(reviewId, emoji, reactorId);
    if (changed === null) return { ok: false };
    const entry = (await store.reactions([reviewId], reactorId)).get(reviewId);
    return { ok: true, counts: entry?.counts ?? {}, mine: entry?.mine ?? [] };
  } catch (error) {
    console.error("[reviews] reaction failed", error);
    return { ok: false };
  }
}

export async function loadMoreReviews(offset: number): Promise<ReviewPage> {
  const store = getReviewStore();
  if (!store || !Number.isInteger(offset) || offset < 0 || offset > 10_000) return { reviews: [], hasMore: false };
  const { rows, hasMore } = await store.list(offset, REVIEWS_PAGE_SIZE);
  return { reviews: await toDTOs(store, rows, await readReactorId()), hasMore };
}
