/** هيكل تحميل (Skeleton) يظهر أثناء جلب المباريات */
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="flex gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-14 w-18 shrink-0 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-48 animate-pulse rounded-xl bg-surface" />
      ))}
    </div>
  );
}
