"use client";

import Link from "next/link";
import { PREMIUM_NAME, SITE_NAME } from "@/lib/brand";
import { useEffect, useState } from "react";

const AD_SECONDS = 5;

/**
 * إعلان قصير قبل البث للنسخة المجانية (Placeholder).
 * لاحقاً: يُستبدل بإعلان VAST/IMA من Google Ad Manager.
 */
export function PreRollAd({ onDone }: { onDone: () => void }) {
  const [remaining, setRemaining] = useState(AD_SECONDS);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-surface-2 to-black p-4 text-center text-white">
      <span className="absolute top-3 start-3 rounded bg-gold px-1.5 py-0.5 text-[10px] font-bold text-black">إعلان</span>
      <p className="text-lg font-bold">مساحة إعلانية قبل البث</p>
      <Link href="/subscribe" className="text-sm font-semibold text-gold hover:underline">
        شاهد بدون إعلانات مع {SITE_NAME} {PREMIUM_NAME} — 1.99$ شهرياً
      </Link>

      <button
        type="button"
        onClick={onDone}
        disabled={remaining > 0}
        className="absolute end-3 bottom-3 rounded-md bg-black/70 px-4 py-2 text-sm font-semibold ring-1 ring-white/20 transition enabled:hover:bg-white enabled:hover:text-black disabled:opacity-80"
      >
        {remaining > 0 ? `تخطَّ الإعلان خلال ${remaining}` : "تخطَّ الإعلان ◂"}
      </button>
    </div>
  );
}
