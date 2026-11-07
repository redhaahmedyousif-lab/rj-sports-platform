import Link from "next/link";
import type { MatchWithRelations } from "@/types/database";
import { hasStarted, isLive } from "@/lib/utils/match";
import { formatKickoffTime } from "@/lib/utils/date";
import { PlayIcon } from "@/components/ui/icons";
import { MatchStatusBadge } from "./MatchStatusBadge";
import { TeamCrest } from "./TeamCrest";

/** صف مباراة واحدة: الفريق المضيف — النتيجة/الموعد — الفريق الضيف */
export function MatchCard({ match }: { match: MatchWithRelations }) {
  const live = isLive(match.status);
  const started = hasStarted(match.status);
  const homeWin = match.status === "finished" && match.home_score > match.away_score;
  const awayWin = match.status === "finished" && match.away_score > match.home_score;

  return (
    <Link
      href={`/match/${match.id}`}
      className="group grid grid-cols-[2.5rem_1fr_auto_1fr_1.5rem] items-center gap-1.5 px-2 sm:grid-cols-[3rem_1fr_auto_1fr_2rem] sm:gap-2 py-3 transition hover:bg-surface-2 sm:px-4"
    >
      {/* الحالة */}
      <div className="flex justify-center">
        {match.status !== "scheduled" && <MatchStatusBadge match={match} />}
      </div>

      {/* المضيف */}
      <div className={`flex min-w-0 items-center justify-end gap-2 text-end ${awayWin ? "text-muted" : ""}`}>
        <span className="line-clamp-2 text-xs font-semibold sm:text-sm">{match.home_team.name}</span>
        <TeamCrest team={match.home_team} />
      </div>

      {/* النتيجة أو الموعد */}
      <div
        dir="ltr"
        className={`min-w-14 rounded-md px-1.5 py-1 sm:min-w-16 sm:px-2 text-center text-sm font-bold tabular-nums ${
          live ? "bg-live/15 text-live" : started ? "bg-surface-2" : "text-muted"
        }`}
      >
        {/* dir=ltr: نعرض نتيجة الضيف يساراً بما يتوافق مع ترتيب الفرق في RTL */}
        {started ? `${match.away_score} - ${match.home_score}` : formatKickoffTime(match.kickoff_at)}
      </div>

      {/* الضيف */}
      <div className={`flex min-w-0 items-center gap-2 ${homeWin ? "text-muted" : ""}`}>
        <TeamCrest team={match.away_team} />
        <span className="line-clamp-2 text-xs font-semibold sm:text-sm">{match.away_team.name}</span>
      </div>

      {/* أيقونة البث */}
      <div className="flex justify-center">
        {match.stream_url && (
          <span
            title="بث مباشر متاح"
            className={`grid size-6 place-items-center rounded-full ${
              live ? "bg-brand text-brand-fg" : "bg-surface-2 text-muted"
            }`}
          >
            <PlayIcon width={10} height={10} />
          </span>
        )}
      </div>
    </Link>
  );
}
