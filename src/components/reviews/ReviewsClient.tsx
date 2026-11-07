"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { loadMoreReviews, submitReview, type SubmitReviewState } from "@/lib/reviews/actions";
import { REVIEW_BODY_MAX, REVIEW_NAME_MAX, type ReviewDTO, type ReviewPage } from "@/lib/reviews/types";
import { charCount } from "@/lib/reviews/validation";
import { ReviewCard } from "./ReviewCard";
import { StarRatingInput } from "./StarRatingInput";

/** النموذج والقائمة معاً: التقييم المرسل يظهر فوراً أعلى القائمة */
export function ReviewsClient({ initial }: { initial: ReviewPage }) {
  const [reviews, setReviews] = useState<ReviewDTO[]>(initial.reviews);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  // عدد ما حُمّل من الخادم (لحساب الصفحة التالية) — منفصل عن التقييمات المضافة محلياً
  const [serverCount, setServerCount] = useState(initial.reviews.length);
  const [newId, setNewId] = useState<string | null>(null);
  const [loadingMore, startLoading] = useTransition();
  const [loadError, setLoadError] = useState(false);

  const onSubmitted = (review: ReviewDTO) => {
    setReviews((list) => [review, ...list.filter((r) => r.id !== review.id)]);
    setServerCount((n) => n + 1); // التقييم الجديد يزيح الصفحات في الخادم بمقدار واحد
    setNewId(review.id);
  };

  const loadMore = () =>
    startLoading(async () => {
      try {
        const page = await loadMoreReviews(serverCount);
        setReviews((list) => {
          const seen = new Set(list.map((r) => r.id));
          return [...list, ...page.reviews.filter((r) => !seen.has(r.id))];
        });
        setServerCount((n) => n + page.reviews.length);
        setHasMore(page.hasMore);
        setLoadError(false);
      } catch {
        setLoadError(true);
      }
    });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
      <ReviewForm onSubmitted={onSubmitted} />

      <div className="min-w-0 space-y-4">
        {reviews.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
            لا توجد تقييمات بعد — كن أول من يقيّم المنصة!
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-live="polite">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} highlight={r.id === newId} />
            ))}
          </div>
        )}

        {hasMore && (
          <div className="flex flex-col items-center gap-2 pt-2">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="rounded-full bg-surface px-8 py-2.5 text-sm font-bold ring-1 ring-border transition hover:bg-surface-2 disabled:opacity-60"
            >
              {loadingMore ? "جارٍ التحميل…" : "عرض المزيد"}
            </button>
            {loadError && <p role="alert" className="text-xs text-live">تعذّر التحميل، حاول مرة أخرى.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewForm({ onSubmitted }: { onSubmitted: (r: ReviewDTO) => void }) {
  const [state, action, pending] = useActionState(submitReview, {} as SubmitReviewState);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const onSubmittedRef = useRef(onSubmitted);
  onSubmittedRef.current = onSubmitted;
  const [, start] = useTransition();
  const count = charCount(body);
  const err = state.errors;

  // بعد النجاح: إضافة التقييم للقائمة وتفريغ النموذج
  useEffect(() => {
    if (!state.ok || !state.nonce) return;
    if (state.review) onSubmittedRef.current(state.review);
    formRef.current?.reset();
    setRating(0);
    setBody("");
  }, [state.ok, state.nonce, state.review]);

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        // بدون إعادة الضبط التلقائية في React 19 — حتى لا يضيع النص عند خطأ التحقق
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(() => action(fd));
      }}
      className="relative space-y-4 rounded-xl border border-border bg-surface p-5 lg:sticky lg:top-20"
      aria-labelledby="review-form-title"
    >
      <h3 id="review-form-title" className="font-extrabold">
        شاركنا رأيك
      </h3>

      <div className="space-y-1.5">
        <label htmlFor="review-name" className="block text-sm font-semibold">
          الاسم
        </label>
        <input
          id="review-name"
          name="name"
          maxLength={REVIEW_NAME_MAX}
          autoComplete="nickname"
          placeholder="اسمك أو لقبك"
          aria-invalid={Boolean(err?.name)}
          aria-describedby={err?.name ? "review-name-error" : undefined}
          className={`w-full rounded-lg border bg-bg px-3 py-2.5 text-sm outline-none transition focus:border-brand ${err?.name ? "border-live" : "border-border"}`}
        />
        {err?.name && <p id="review-name-error" className="text-xs text-live">{err.name}</p>}
      </div>

      <div className="space-y-1.5">
        <span className="block text-sm font-semibold">التقييم</span>
        <StarRatingInput value={rating} onChange={setRating} invalid={Boolean(err?.rating)} describedBy={err?.rating ? "review-rating-error" : undefined} />
        {err?.rating && <p id="review-rating-error" className="text-xs text-live">{err.rating}</p>}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="review-body" className="text-sm font-semibold">
            التعليق
          </label>
          <span
            data-testid="char-counter"
            aria-live="polite"
            className={`text-xs tabular-nums ${count > REVIEW_BODY_MAX ? "font-bold text-live" : count > REVIEW_BODY_MAX * 0.9 ? "text-gold" : "text-muted"}`}
          >
            {count}/{REVIEW_BODY_MAX}
          </span>
        </div>
        <textarea
          id="review-body"
          name="body"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="ما الذي أعجبك؟ وما الذي تتمنى تحسينه؟"
          aria-invalid={Boolean(err?.body) || count > REVIEW_BODY_MAX}
          aria-describedby={err?.body ? "review-body-error" : undefined}
          className={`w-full resize-y rounded-lg border bg-bg px-3 py-2.5 text-sm leading-relaxed outline-none transition focus:border-brand ${err?.body || count > REVIEW_BODY_MAX ? "border-live" : "border-border"}`}
        />
        {err?.body && <p id="review-body-error" className="text-xs text-live">{err.body}</p>}
      </div>

      {/* حقل فخ للبوتات — مخفي عن البشر وعن قارئات الشاشة */}
      <div aria-hidden className="pointer-events-none absolute top-0 start-0 size-px overflow-hidden opacity-0">
        <label>
          الموقع
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending || count > REVIEW_BODY_MAX}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 font-bold text-brand-fg transition hover:brightness-110 disabled:opacity-60"
      >
        {pending && <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-brand-fg/30 border-t-brand-fg" />}
        {pending ? "جارٍ الإرسال…" : "إرسال التقييم"}
      </button>

      {state.message && (
        <p role={state.ok ? "status" : "alert"} className={`text-center text-sm ${state.ok ? "text-brand" : "text-live"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
