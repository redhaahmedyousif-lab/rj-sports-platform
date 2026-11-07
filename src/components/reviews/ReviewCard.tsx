"use client";

import { useState, useTransition } from "react";
import { toggleReviewReaction } from "@/lib/reviews/actions";
import { REACTION_EMOJIS, type ReactionEmoji, type ReviewDTO } from "@/lib/reviews/types";
import { CrownIcon } from "@/components/ui/icons";
import { Stars } from "./Stars";

const BADGES = {
  premium: { label: "مشترك Premium", cls: "bg-gold/15 text-gold ring-gold/30" },
  member: { label: "عضو", cls: "bg-brand/15 text-brand ring-brand/30" },
  guest: { label: "زائر", cls: "bg-surface-2 text-muted ring-border" },
} as const;

const AVATAR_COLORS = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#ca8a04", "#db2777"];

function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function ReviewCard({ review, highlight }: { review: ReviewDTO; highlight?: boolean }) {
  const badge = BADGES[review.badge];

  return (
    <article
      data-review-id={review.id}
      className={`flex flex-col gap-3 rounded-xl border bg-surface p-4 transition ${
        highlight ? "border-brand/60 ring-2 ring-brand/20" : "border-border"
      }`}
    >
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full text-base font-bold text-white"
          style={{ background: avatarColor(review.name) }}
        >
          {Array.from(review.name)[0]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-bold">{review.name}</h3>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${badge.cls}`}>
              {review.badge === "premium" && <CrownIcon width={11} height={11} />}
              {badge.label}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
            <Stars value={review.rating} size={14} />
            <time dateTime={review.createdAt} title={new Date(review.createdAt).toLocaleString("ar-u-nu-latn")}>
              {review.timeAgo}
            </time>
          </div>
        </div>
      </header>

      {/* النص يُعرض كنص عادي (React يهرّب أي HTML) مع الحفاظ على الأسطر */}
      <p dir="auto" className="flex-1 whitespace-pre-line break-words text-sm leading-relaxed text-fg/90">
        {review.body}
      </p>

      <ReactionBar reviewId={review.id} initialCounts={review.reactions} initialMine={review.mine} />
    </article>
  );
}

function ReactionBar({
  reviewId,
  initialCounts,
  initialMine,
}: {
  reviewId: string;
  initialCounts: ReviewDTO["reactions"];
  initialMine: ReactionEmoji[];
}) {
  const [counts, setCounts] = useState(initialCounts);
  const [mine, setMine] = useState<ReactionEmoji[]>(initialMine);
  const [pending, start] = useTransition();

  const toggle = (emoji: ReactionEmoji) => {
    // تحديث فوري متفائل، ثم اعتماد القيم الحقيقية من الخادم (أو التراجع عند الفشل)
    const prev = { counts, mine };
    const active = mine.includes(emoji);
    setMine(active ? mine.filter((e) => e !== emoji) : [...mine, emoji]);
    setCounts({ ...counts, [emoji]: Math.max(0, (counts[emoji] ?? 0) + (active ? -1 : 1)) });
    start(async () => {
      const res = await toggleReviewReaction(reviewId, emoji);
      if (res.ok && res.counts && res.mine) {
        setCounts(res.counts);
        setMine(res.mine);
      } else {
        setCounts(prev.counts);
        setMine(prev.mine);
      }
    });
  };

  return (
    <div role="group" aria-label="التفاعلات" aria-busy={pending} className="flex flex-wrap gap-1.5 border-t border-border pt-3">
      {REACTION_EMOJIS.map((emoji) => {
        const count = counts[emoji] ?? 0;
        const active = mine.includes(emoji);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => toggle(emoji)}
            aria-pressed={active}
            aria-label={`${emoji} ${count}`}
            data-emoji={emoji}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-sm ring-1 transition active:scale-95 ${
              active ? "bg-brand/15 ring-brand/50" : "bg-surface-2/60 ring-border hover:bg-surface-2"
            }`}
          >
            <span aria-hidden>{emoji}</span>
            <span className={`text-xs font-bold tabular-nums ${count ? (active ? "text-brand" : "text-fg") : "text-muted/60"}`}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
