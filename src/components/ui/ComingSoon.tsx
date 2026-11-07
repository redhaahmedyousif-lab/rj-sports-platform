import Link from "next/link";

/** صفحة مؤقتة للأقسام التي ستُبنى في الخطوات القادمة */
export function ComingSoon({ title, step, children }: { title: string; step?: number; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-border bg-surface p-8 text-center">
      {step && (
      <span className="mb-3 inline-block rounded-full bg-brand/15 px-3 py-1 text-xs font-bold text-brand">
        الخطوة {step}
      </span>
      )}
      <h1 className="mb-2 text-2xl font-extrabold">{title}</h1>
      <p className="mb-6 text-muted">{children ?? "هذا القسم قيد الإنشاء وسيُبنى في الخطوة القادمة."}</p>
      <Link href="/" className="rounded-lg bg-surface-2 px-4 py-2 text-sm font-semibold hover:bg-border">
        العودة للمباريات
      </Link>
    </div>
  );
}
