import Link from "next/link";
import { RealtimeRefresh } from "@/components/admin/RealtimeRefresh";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminStats, listAdminMatches } from "@/lib/admin/data";
import { formatKickoffTime } from "@/lib/utils/date";

export const metadata = { title: "نظرة عامة" };

export default async function AdminOverview() {
  const { basePath } = await requireAdmin();
  const [stats, live, upcoming] = await Promise.all([
    getAdminStats(),
    listAdminMatches("live"),
    listAdminMatches("upcoming").then((r) => r.slice(0, 5)),
  ]);

  const mrr = (stats.premiumUsers * 1.99).toFixed(2);
  const cards = [
    { id: "total", label: "إجمالي المباريات", value: stats.totalMatches, hint: `${stats.todayMatches} اليوم`, accent: "" },
    { id: "live", label: "مباريات جارية الآن", value: stats.liveMatches, hint: "مباشر + استراحة", accent: "text-live" },
    { id: "streaming", label: "تُبث الآن", value: stats.streamingNow, hint: "بث HLS نشط", accent: "text-brand" },
    {
      id: "premium",
      label: "مشتركو Premium",
      value: stats.premiumUsers,
      hint: `من ${stats.totalUsers} مستخدم · ≈ ${mrr}$ شهرياً`,
      accent: "text-gold",
    },
  ];

  return (
    <div className="space-y-6">
      <RealtimeRefresh tables={["matches", "subscriptions"]} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">نظرة عامة</h1>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className="size-1.5 animate-pulse rounded-full bg-brand" /> تحديث لحظي
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.id} data-stat={c.id} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">{c.label}</p>
            <p data-value className={`mt-1 text-3xl font-extrabold tabular-nums ${c.accent}`}>
              {c.value}
            </p>
            <p className="mt-1 text-[11px] text-muted">{c.hint}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-border bg-surface">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 font-bold">
            <span className="size-2 animate-pulse rounded-full bg-live" /> المباريات الجارية
          </h2>
          <Link href={`${basePath}/matches?filter=live`} className="text-xs text-muted hover:text-fg">
            عرض الكل
          </Link>
        </header>
        {live.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">لا توجد مباريات جارية الآن.</p>
        ) : (
          <ul className="divide-y divide-border">
            {live.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="w-14 text-xs font-bold text-live">
                  {m.status === "halftime" ? "استراحة" : `${m.minute ?? 0}'`}
                </span>
                <span className="flex-1 text-sm font-semibold">
                  {m.home_team.name}
                  <span dir="ltr" className="mx-2 inline-block tabular-nums">
                    {m.away_score} - {m.home_score}
                  </span>
                  {m.away_team.name}
                </span>
                {m.stream_url && <span className="rounded bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand">بث</span>}
                <Link href={`${basePath}/matches/${m.id}`} className="rounded-lg bg-live px-3 py-1.5 text-xs font-bold text-white">
                  التحكم المباشر
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-bold">القادمة</h2>
          <Link href={`${basePath}/matches/new`} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-brand-fg">
            + مباراة جديدة
          </Link>
        </header>
        <ul className="divide-y divide-border">
          {upcoming.map((m) => (
            <li key={m.id}>
              <Link href={`${basePath}/matches/${m.id}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-2">
                <span dir="ltr" className="w-12 text-xs text-muted">
                  {formatKickoffTime(m.kickoff_at)}
                </span>
                <span className="flex-1 font-semibold">
                  {m.home_team.name} × {m.away_team.name}
                </span>
                <span className="text-xs text-muted">{m.league.name}</span>
              </Link>
            </li>
          ))}
          {upcoming.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">لا توجد مباريات قادمة.</li>}
        </ul>
      </section>
    </div>
  );
}
