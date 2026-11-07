import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: { default: "لوحة التحكم", template: "%s | لوحة التحكم" },
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // طبقة الحماية الثانية بعد proxy.ts
  const { profile, basePath } = await requireAdmin();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="hidden rounded-xl border border-border bg-surface p-4 lg:block">
          <p className="text-xs text-muted">مسجل كمشرف</p>
          <p className="truncate text-sm font-bold">{profile.full_name ?? "Admin"}</p>
        </div>
        <AdminNav basePath={basePath} />
        <Link href="/" className="hidden px-3 text-xs text-muted hover:text-fg lg:block">
          ← العودة للموقع
        </Link>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
