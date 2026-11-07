import type { LeagueGroup } from "@/lib/data/matches";
import { isLive } from "@/lib/utils/match";
import { MatchCard } from "./MatchCard";

/** بطاقة دوري تحتوي على مبارياته */
export function LeagueSection({ group }: { group: LeagueGroup }) {
  const liveCount = group.matches.filter((m) => isLive(m.status)).length;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface">
      <header className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <span className="grid size-7 place-items-center rounded-md bg-surface-2 text-xs font-bold text-brand">
          {group.league.name.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold">{group.league.name}</h2>
          {group.league.country && <p className="text-xs text-muted">{group.league.country}</p>}
        </div>
        {liveCount > 0 && (
          <span className="ms-auto rounded-full bg-live/15 px-2 py-0.5 text-xs font-bold text-live">
            {liveCount} مباشر
          </span>
        )}
      </header>
      <ul className="divide-y divide-border">
        {group.matches.map((match) => (
          <li key={match.id}>
            <MatchCard match={match} />
          </li>
        ))}
      </ul>
    </section>
  );
}
