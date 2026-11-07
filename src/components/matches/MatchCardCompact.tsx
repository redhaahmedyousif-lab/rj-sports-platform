import Link from "next/link";
import type { MatchWithRelations, Team } from "@/types/database";
import { hasStarted, isLive } from "@/lib/utils/match";
import { MatchStatusBadge } from "./MatchStatusBadge";
import { TeamCrest } from "./TeamCrest";

/** بطاقة مباراة مضغوطة (الفريقان فوق بعض) للأعمدة الضيقة مثل الشريط الجانبي */
export function MatchCardCompact({ match }: { match: MatchWithRelations }) {
  const started = hasStarted(match.status);
  const live = isLive(match.status);

  return (
    <Link href={`/match/${match.id}`} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-surface-2">
      <div className="w-12 shrink-0 text-center">
        <MatchStatusBadge match={match} />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <TeamLine team={match.home_team} score={started ? match.home_score : null} live={live} />
        <TeamLine team={match.away_team} score={started ? match.away_score : null} live={live} />
      </div>
    </Link>
  );
}

function TeamLine({ team, score, live }: { team: Team; score: number | null; live: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <TeamCrest team={team} size={18} />
      <span className="flex-1 truncate text-sm">{team.name}</span>
      {score !== null && <span className={`text-sm font-bold tabular-nums ${live ? "text-live" : ""}`}>{score}</span>}
    </div>
  );
}
