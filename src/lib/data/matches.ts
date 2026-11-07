import "server-only";
import { cache } from "react";
import type { League, MatchDetails, MatchEvent, MatchWithRelations } from "@/types/database";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { addDays, toDateKey } from "@/lib/utils/date";
import { isLive } from "@/lib/utils/match";
import { getMockMatch, getMockMatches } from "./mock-data";

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

/** تفاصيل مباراة واحدة مع الأحداث والإحصائيات والتشكيلات. مُخزّنة لكل طلب (تُستخدم في الصفحة و generateMetadata) */
export const getMatchById = cache(async (id: string): Promise<MatchDetails | null> => {
  if (!isSupabaseConfigured) return getMockMatch(id);

  // المعرّفات في Supabase من نوع uuid — نتجنب استعلاماً فاشلاً لقيم غير صالحة
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const supabase = await createClient();
  const [matchRes, eventsRes] = await Promise.all([
    supabase.from("matches").select(MATCH_SELECT).eq("id", id).maybeSingle(),
    supabase
      .from("match_events")
      .select("*")
      .eq("match_id", id)
      .order("minute")
      .order("extra_minute", { nullsFirst: true }),
  ]);

  if (matchRes.error) console.error("[getMatchById]", matchRes.error.message);
  if (!matchRes.data) return null;

  const match = matchRes.data as MatchDetails;
  return {
    ...match,
    stats: match.stats ?? {},
    lineups: match.lineups ?? null,
    events: (eventsRes.data ?? []) as MatchEvent[],
  };
});
