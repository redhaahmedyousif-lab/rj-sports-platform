import { getReviewsSection } from "@/lib/reviews/service";
import { SITE_NAME } from "@/lib/brand";
import { ReviewsClient } from "./ReviewsClient";
import { Stars } from "./Stars";

/** قسم تقييمات المستخدمين: الملخص (خادم) + النموذج والقائمة (عميل) */
export async function ReviewsSection() {
  const { enabled, summary, page } = await getReviewsSection();
  if (!enabled) return null;

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="space-y-6">
      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-gradient-to-bl from-gold/10 via-surface to-surface p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex-1">
          <h2 id="reviews-title" className="text-2xl font-extrabold">
            آراء المستخدمين
          </h2>
          <p className="mt-1 text-sm text-muted">ماذا يقول المشجعون عن {SITE_NAME}</p>
        </div>

        <div className="flex items-center gap-5">
          <div className="text-center" data-testid="rating-summary">
            <p className="text-5xl font-extrabold tabular-nums" data-testid="rating-average">
              {summary.average.toFixed(1)}
            </p>
            <Stars value={summary.average} size={18} label={`متوسط التقييم ${summary.average} من 5`} />
            <p className="mt-1 text-xs text-muted">
              من <span data-testid="rating-total" className="font-bold text-fg tabular-nums">{summary.total}</span> تقييم
            </p>
          </div>

          <dl className="w-40 space-y-1 sm:w-48" aria-label="توزيع التقييمات">
            {summary.distribution.map((count, i) => {
              const stars = 5 - i;
              const pct = summary.total ? (count / summary.total) * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-2 text-xs">
                  <dt className="w-3 text-muted tabular-nums">{stars}</dt>
                  <dd className="flex flex-1 items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <span className="block h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-6 text-end text-muted tabular-nums">{count}</span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>

      <ReviewsClient initial={page} />
    </section>
  );
}
