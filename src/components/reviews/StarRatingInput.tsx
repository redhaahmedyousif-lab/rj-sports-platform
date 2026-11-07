"use client";

import { useState } from "react";
import { Star } from "./Stars";

const LABELS = ["", "سيئ", "مقبول", "جيد", "جيد جداً", "ممتاز"];

/**
 * اختيار التقييم بالنجوم: مجموعة أزرار راديو حقيقية (لوحة المفاتيح + قارئ الشاشة)
 * مع معاينة عند المرور بالمؤشر.
 */
export function StarRatingInput({
  value,
  onChange,
  invalid,
  describedBy,
}: {
  value: number;
  onChange: (v: number) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex items-center gap-3">
      <div
        role="radiogroup"
        aria-label="التقييم"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        dir="ltr"
        className="flex gap-1"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="cursor-pointer rounded-md p-0.5 transition hover:scale-110 has-focus-visible:outline-2 has-focus-visible:outline-brand"
            onMouseEnter={() => setHover(n)}
          >
            <input
              type="radio"
              name="rating"
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
              aria-label={`${n} ${n === 1 ? "نجمة" : n === 2 ? "نجمتان" : "نجوم"} — ${LABELS[n]}`}
            />
            <Star fill={n <= shown ? 1 : 0} size={30} />
          </label>
        ))}
      </div>
      <span className="min-w-16 text-sm font-semibold text-gold" aria-live="polite">
        {LABELS[shown]}
      </span>
    </div>
  );
}
