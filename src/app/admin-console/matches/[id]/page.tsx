import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteMatchButton } from "@/components/admin/DeleteMatchButton";
import { EventsPanel } from "@/components/admin/EventsPanel";
import { LiveControl } from "@/components/admin/LiveControl";
import { MatchForm } from "@/components/admin/MatchForm";
import { RealtimeRefresh } from "@/components/admin/RealtimeRefresh";
import { StatsEditor } from "@/components/admin/StatsEditor";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminMatch, getCatalog } from "@/lib/admin/data";
import { APP_TIMEZONE } from "@/lib/utils/date";
import { isoToZonedInput } from "@/lib/utils/zoned-time";

export const metadata = { title: "إدارة المباراة" };

export default async function AdminMatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { basePath } = await requireAdmin();
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const [match, catalog] = await Promise.all([getAdminMatch(id), getCatalog()]);
  if (!match) notFound();

  const home = match.home_team.name;
  const away = match.away_team.name;

  return (
    <div className="space-y-5">
      {/* مشرف آخر يعدّل نفس المباراة؟ تصلك تحديثاته فوراً */}
      <RealtimeRefresh tables={["matches", "match_events"]} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`${basePath}/matches`} className="text-xs text-muted hover:text-fg">
            ← المباريات
          </Link>
          <h1 className="text-2xl font-extrabold">
            {home} × {away}
          </h1>
          <p className="text-xs text-muted">{match.league.name}</p>
        </div>
        <Link href={`/match/${match.id}`} target="_blank" className="rounded-lg bg-surface-2 px-3 py-2 text-sm font-semibold ring-1 ring-border hover:bg-border">
          عرض في الموقع ↗
        </Link>
      </div>

      {created && (
        <p role="status" className="rounded-lg bg-brand/10 px-4 py-2 text-sm text-brand ring-1 ring-brand/30">
          تم إنشاء المباراة ✓ — يمكنك الآن التحكم بها مباشرة.
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          <LiveControl
            matchId={match.id}
            status={match.status}
            minute={match.minute}
            homeScore={match.home_score}
            awayScore={match.away_score}
            homeName={home}
            awayName={away}
          />
          <StatsEditor matchId={match.id} stats={match.stats} homeName={home} awayName={away} />
        </div>
        <EventsPanel matchId={match.id} currentMinute={match.minute} events={match.events} homeName={home} awayName={away} />
      </div>

      <details className="group rounded-xl border border-border bg-surface">
        <summary className="flex cursor-pointer list-none items-center justify-between p-5 font-extrabold">
          بيانات المباراة (الفرق، الموعد، رابط البث)
          <span className="text-muted transition group-open:rotate-180">⌄</span>
        </summary>
        <div className="border-t border-border p-5">
          <MatchForm
            leagues={catalog.leagues}
            teams={catalog.teams}
            timezone={APP_TIMEZONE}
            values={{
              id: match.id,
              league_id: match.league_id,
              home_team_id: match.home_team_id,
              away_team_id: match.away_team_id,
              kickoff_local: isoToZonedInput(match.kickoff_at),
              status: match.status,
              venue: match.venue,
              round: match.round,
              stream_url: match.stream_url,
              is_featured: match.is_featured,
            }}
          />
        </div>
      </details>

      <DeleteMatchButton matchId={match.id} label={`${home} × ${away}`} />
    </div>
  );
}
