import Link from "next/link";
import type { MatchWithRelations } from "@/types/database";
import { formatKickoffTime } from "@/lib/utils/date";
import { hasStarted, isLive } from "@/lib/utils/match";
import { PlayIcon } from "@/components/ui/icons";
import { MatchStatusBadge } from "./MatchStatusBadge";
import { TeamCrest } from "./TeamCrest";

/** بطاقة المباراة المميزة أعلى الصفحة مع زر المشاهدة */
export function FeaturedMatch({ match }: { match: MatchWithRelations }) {
  const live = isLive(match.status);

  return (
    <Link
      href={`/match/${match.id}`}
      className="relative block overflow-hidden rounded-2xl border border-border bg-gradient-to-bl from-brand/20 via-surface to-surface p-5 transition hover:border-brand/50"
    >
      <div className="mb-4 flex items-center justify-between text-xs text-muted">
        <span className="font-semibold text-fg">{match.league.name}</span>
        <span>{match.round}</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <TeamColumn team={match.home_team} />
        <div className="flex flex-col items-center gap-1">
          <span dir="ltr" className="text-3xl font-extrabold tabular-nums sm:text-4xl">
            {hasStarted(match.status)
              ? `${match.away_score} - ${match.home_score}`
              : formatKickoffTime(match.kickoff_at)}
          </span>
          <MatchStatusBadge match={match} />
        </div>
        <TeamColumn team={match.away_team} />
      </div>

      {match.stream_url && (
        <div className="mt-5 flex justify-center">
          <span
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold ${
              live ? "bg-brand text-brand-fg" : "bg-surface-2 text-fg"
            }`}
          >
            <PlayIcon width={14} height={14} />
            {live ? "شاهد البث المباشر" : "البث متاح عند الانطلاق"}
          </span>
        </div>
      )}
    </Link>
  );
}

function TeamColumn({ team }: { team: MatchWithRelations["home_team"] }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <TeamCrest team={team} size={56} />
      <span className="text-sm font-bold sm:text-base">{team.name}</span>
    </div>
  );
}
