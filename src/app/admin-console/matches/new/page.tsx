import Link from "next/link";
import { MatchForm } from "@/components/admin/MatchForm";
import { requireAdmin } from "@/lib/admin/auth";
import { getCatalog } from "@/lib/admin/data";
import { APP_TIMEZONE } from "@/lib/utils/date";

export const metadata = { title: "مباراة جديدة" };

export default async function NewMatchPage() {
  const { basePath } = await requireAdmin();
  const { leagues, teams } = await getCatalog();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">مباراة جديدة</h1>
      {leagues.length === 0 || teams.length < 2 ? (
        <p className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
          أضف بطولة وفريقين على الأقل أولاً من{" "}
          <Link href={`${basePath}/teams`} className="font-bold text-brand">
            الفرق والبطولات
          </Link>
          .
        </p>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
          <MatchForm leagues={leagues} teams={teams} timezone={APP_TIMEZONE} />
        </div>
      )}
    </div>
  );
}
