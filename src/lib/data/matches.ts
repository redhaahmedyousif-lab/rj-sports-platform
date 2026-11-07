import "server-only";
import type { League, MatchWithRelations } from "@/types/database";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { addDays, toDateKey } from "@/lib/utils/date";
import { isLive } from "@/lib/utils/match";
import { getMockMatches } from "./mock-data";

const MATCH_SELECT = `
  *,
  league:leagues(*),
  home_team:teams!matches_home_team_id_fkey(*),
  away_team:teams!matches_away_team_id_fkey(*)
`;

/** جلب مباريات يوم محدد (مفتاح YYYY-MM-DD بتوقيت التطبيق) */
export async function getMatchesByDate(dateKey: string): Promise<MatchWithRelations[]> {
  let matches: MatchWithRelations[];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    // نطاق واسع بيوم من كل جهة ثم نفلتر حسب المنطقة الزمنية بدقة
    const { data, error } = await supabase
      .from("matches")
      .select(MATCH_SELECT)
      .gte("kickoff_at", `${addDays(dateKey, -1)}T00:00:00Z`)
      .lt("kickoff_at", `${addDays(dateKey, 2)}T00:00:00Z`)
      .order("kickoff_at");

    if (error) {
      console.error("[getMatchesByDate]", error.message);
      return [];
    }
    matches = (data ?? []) as MatchWithRelations[];
  } else {
    matches = getMockMatches();
  }

  return matches.filter((m) => toDateKey(m.kickoff_at) === dateKey);
}

export interface LeagueGroup {
  league: League;
  matches: MatchWithRelations[];
}

/** تجميع المباريات حسب الدوري: الدوريات حسب الأولوية، والمباريات المباشرة أولاً ثم حسب الموعد */
export function groupByLeague(matches: MatchWithRelations[]): LeagueGroup[] {
  const groups = new Map<string, LeagueGroup>();

  for (const match of matches) {
    const group = groups.get(match.league_id) ?? { league: match.league, matches: [] };
    group.matches.push(match);
    groups.set(match.league_id, group);
  }

  const sorted = [...groups.values()].sort((a, b) => a.league.priority - b.league.priority);
  for (const group of sorted) {
    group.matches.sort((a, b) => {
      const liveDiff = Number(isLive(b.status)) - Number(isLive(a.status));
      return liveDiff || a.kickoff_at.localeCompare(b.kickoff_at);
    });
  }
  return sorted;
}
