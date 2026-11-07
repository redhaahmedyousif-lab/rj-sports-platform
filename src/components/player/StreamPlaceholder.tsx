"use client";

import { useEffect, useState } from "react";

/** شاشة بديلة للمشغل: عدّ تنازلي قبل البث، أو رسالة عدم توفر البث */
export function StreamPlaceholder({ kickoffAt, hasStream }: { kickoffAt: string; hasStream: boolean }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = now === null ? null : Math.max(0, new Date(kickoffAt).getTime() - now);

  return (
    <div className="relative flex aspect-video w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-border bg-[radial-gradient(ellipse_at_top,var(--color-surface-2),var(--color-bg))] p-4 text-center">
      {hasStream ? (
        <>
          <p className="text-sm text-muted">يبدأ البث المباشر خلال</p>
          <Countdown ms={remaining} />
          <p className="text-xs text-muted">سيظهر المشغل تلقائياً عند انطلاق المباراة</p>
        </>
      ) : (
        <>
          <span className="text-4xl" aria-hidden>
            📺
          </span>
          <p className="font-semibold">لا يتوفر بث مباشر لهذه المباراة</p>
          <p className="text-xs text-muted">تابع الأحداث والإحصائيات لحظة بلحظة أدناه</p>
        </>
      )}
    </div>
  );
}

function Countdown({ ms }: { ms: number | null }) {
  const total = ms === null ? null : Math.floor(ms / 1000);
  const parts =
    total === null
      ? ["--", "--", "--"]
      : [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60].map((n) => String(n).padStart(2, "0"));
  const labels = ["ساعة", "دقيقة", "ثانية"];

  return (
    <div className="flex gap-3" role="timer" aria-live="off">
      {parts.map((value, i) => (
        <div key={labels[i]} className="flex min-w-16 flex-col items-center rounded-xl bg-surface px-3 py-2 ring-1 ring-border">
          <span className="text-2xl font-extrabold tabular-nums sm:text-3xl">{value}</span>
          <span className="text-[10px] text-muted">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}
