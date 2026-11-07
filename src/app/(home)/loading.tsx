/**
 * هيكل تحميل (Skeleton) للصفحة الرئيسية فقط.
 * موجود داخل مجموعة (home) عمداً: لو كان في جذر app لغلّف كل الصفحات وجعل
 * notFound() في صفحة المباراة يُرجع 200 بدل 404 (بسبب الـ streaming).
 */
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="flex gap-2 overflow-hidden">
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
