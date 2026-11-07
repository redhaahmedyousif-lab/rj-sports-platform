import Link from "next/link";
import { RealtimeRefresh } from "@/components/admin/RealtimeRefresh";
import { requireAdmin } from "@/lib/admin/auth";
import { listAdminMatches, type MatchListFilter } from "@/lib/admin/data";
import { APP_TIMEZONE } from "@/lib/utils/date";
import { STATUS_LABEL } from "@/lib/admin/labels";

export const metadata = { title: "المباريات" };

const FILTERS: { id: MatchListFilter; label: string }[] = [
  { id: "upcoming", label: "القادمة" },
  { id: "live", label: "الجارية" },
  { id: "finished", label: "المنتهية" },
  { id: "all", label: "الكل" },
];


const dateFmt = new Intl.DateTimeFormat("ar-u-nu-latn", {
  timeZone: APP_TIMEZONE,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export default async function AdminMatches({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string; deleted?: string }> }) {
  const { basePath } = await requireAdmin();
  const params = await searchParams;
  const filter = (FILTERS.some((f) => f.id === params.filter) ? params.filter : "upcoming") as MatchListFilter;
  const q = params.q?.slice(0, 50);
  const matches = await listAdminMatches(filter, q);

  return (
    <div className="space-y-4">
      <RealtimeRefresh tables={["matches"]} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">المباريات</h1>
        <Link href={`${basePath}/matches/new`} className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-brand-fg">
          + مباراة جديدة
        </Link>
      </div>

      {params.deleted && (
        <p role="status" className="rounded-lg bg-brand/10 px-4 py-2 text-sm text-brand ring-1 ring-brand/30">
          تم حذف المباراة.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full bg-surface p-1 ring-1 ring-border">
          {FILTERS.map((f) => (
            <Link
              key={f.id}
              href={`${basePath}/matches?filter=${f.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              aria-current={f.id === filter ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${f.id === filter ? "bg-surface-2 text-fg" : "text-muted hover:text-fg"}`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <form className="flex-1" role="search">
          <input type="hidden" name="filter" value={filter} />
          <input
            name="q"
            defaultValue={q}
            placeholder="ابحث بالفريق أو البطولة…"
            aria-label="بحث"
            className="w-full min-w-48 rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-brand"
          />
        </form>
      </div>

      <div className="relative overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th scope="col" className="px-4 py-3 text-start font-semibold">الموعد</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">المباراة</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">البطولة</th>
              <th scope="col" className="px-4 py-3 font-semibold">الحالة</th>
              <th scope="col" className="px-4 py-3 font-semibold">بث</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">إجراءات</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {matches.map((m) => {
              const s = STATUS_LABEL[m.status];
              const started = m.status === "live" || m.status === "halftime" || m.status === "finished";
              return (
                <tr key={m.id} className="hover:bg-surface-2/50">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{dateFmt.format(new Date(m.kickoff_at))}</td>
                  <td className="px-4 py-3 font-semibold">
                    {m.home_team.name}
                    <span dir="ltr" className="mx-2 inline-block text-muted tabular-nums">
                      {started ? `${m.away_score} - ${m.home_score}` : "×"}
                    </span>
                    {m.away_team.name}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{m.league.name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${s.cls}`}>
                      {s.text}
                      {m.status === "live" && m.minute != null ? ` ${m.minute}'` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">{m.stream_url ? "✓" : <span className="text-muted">—</span>}</td>
                  <td className="px-4 py-3 text-end">
                    <Link href={`${basePath}/matches/${m.id}`} className="rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-bold ring-1 ring-border hover:bg-border">
                      إدارة
                    </Link>
                  </td>
                </tr>
              );
            })}
            {matches.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  لا توجد مباريات.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
