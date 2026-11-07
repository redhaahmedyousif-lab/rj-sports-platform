import Link from "next/link";

type AdSize = "leaderboard" | "rectangle";

const SIZES: Record<AdSize, string> = {
  leaderboard: "h-[90px] w-full", // 728×90 (يتقلص على الجوال)
  rectangle: "h-[250px] w-full max-w-[300px]", // 300×250
};

/**
 * مساحة إعلانية للنسخة المجانية.
 * - تُخفى تلقائياً للمشتركين (hidden = isPremium).
 * - حالياً Placeholder؛ لاحقاً يوضع هنا سكربت Google AdSense أو أي شبكة إعلانية،
 *   باستخدام slot لتمييز كل وحدة إعلانية.
 */
export function BannerAd({
  slot,
  size = "leaderboard",
  hidden = false,
}: {
  slot: string;
  size?: AdSize;
  hidden?: boolean;
}) {
  if (hidden) return null;

  return (
    <aside
      aria-label="إعلان"
      data-ad-slot={slot}
      className={`${SIZES[size]} relative mx-auto flex flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-dashed border-border bg-surface/60 text-center`}
    >
      <span className="absolute top-1.5 start-2 text-[10px] uppercase tracking-wider text-muted/70">إعلان</span>
      <p className="text-sm text-muted">مساحة إعلانية</p>
      <Link href="/subscribe" className="text-xs font-semibold text-gold hover:underline">
        أزل الإعلانات مقابل 1.99$ شهرياً
      </Link>
    </aside>
  );
}
