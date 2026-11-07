import Link from "next/link";
import type { MatchDetails, MatchEvent, Team, TeamSide } from "@/types/database";
import { APP_TIMEZONE, formatKickoffTime } from "@/lib/utils/date";
import { hasStarted } from "@/lib/utils/match";
import { MatchStatusBadge } from "@/components/matches/MatchStatusBadge";
import { TeamCrest } from "@/components/matches/TeamCrest";
import { formatMinute } from "./MatchTimeline";

const dateFormatter = new Intl.DateTimeFormat("ar-u-nu-latn", {
  timeZone: APP_TIMEZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const SCORING = new Set<MatchEvent["type"]>(["goal", "own_goal", "penalty_goal"]);

/** رأس الصفحة: الفريقان، النتيجة، الحالة، ومسجلو الأهداف */
export function MatchHeader({ match }: { match: MatchDetails }) {
  const started = hasStarted(match.status);

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <Link href="/" className="font-semibold text-fg hover:text-brand">
          {match.league.name}
        </Link>
        <span>
          {match.round && `${match.round} · `}
          {dateFormatter.format(new Date(match.kickoff_at))}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        <TeamBlock team={match.home_team} />

        <div className="flex flex-col items-center gap-1.5 pt-2">
          <span dir="ltr" className="text-4xl font-extrabold tabular-nums sm:text-5xl">
            {started ? `${match.away_score} - ${match.home_score}` : formatKickoffTime(match.kickoff_at)}
          </span>
          {match.status === "scheduled" ? (
            <span className="text-xs text-muted">لم تبدأ</span>
          ) : (
            <MatchStatusBadge match={match} />
          )}
        </div>

        <TeamBlock team={match.away_team} />
      </div>

      {/* مسجلو الأهداف */}
      {started && (match.home_score > 0 || match.away_score > 0) && (
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] gap-3 text-xs text-muted">
          <Scorers events={match.events} side="home" />
          <span className="pt-0.5" aria-hidden>
            ⚽
          </span>
          <Scorers events={match.events} side="away" />
        </div>
      )}

      {match.venue && (
        <p className="mt-5 border-t border-border pt-3 text-center text-xs text-muted">🏟️ {match.venue}</p>
      )}
    </section>
  );
}

function TeamBlock({ team }: { team: Team }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <TeamCrest team={team} size={64} />
      <h2 className="text-sm font-bold sm:text-lg">{team.name}</h2>
    </div>
  );
}

function Scorers({ events, side }: { events: MatchEvent[]; side: TeamSide }) {
  // تجميع أهداف كل لاعب: "محمد صلاح 12'، 67'"
  const byPlayer = new Map<string, string[]>();
  for (const e of events) {
    if (e.team !== side || !SCORING.has(e.type)) continue;
    const suffix = e.type === "penalty_goal" ? " (ج)" : e.type === "own_goal" ? " (ع)" : "";
    byPlayer.set(e.player, [...(byPlayer.get(e.player) ?? []), formatMinute(e) + suffix]);
  }

  return (
    <ul className={`space-y-0.5 ${side === "home" ? "text-end" : "text-start"}`}>
      {[...byPlayer].map(([player, minutes]) => (
        <li key={player}>
          <span className="text-fg">{player}</span> {minutes.join("، ")}
        </li>
      ))}
    </ul>
  );
}
