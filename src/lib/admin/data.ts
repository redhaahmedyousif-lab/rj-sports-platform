import "server-only";
import type { League, Match, MatchEvent, MatchStats, Team } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { addDays, todayKey } from "@/lib/utils/date";
import { zonedInputToIso } from "@/lib/utils/zoned-time";

export interface AdminStats {
  totalMatches: number;
  todayMatches: number;
  liveMatches: number;
  streamingNow: number;
  premiumUsers: number;
  totalUsers: number;
}

/** إحصائيات لوحة التحكم — استعلامات count فقط (بدون جلب الصفوف) */
export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient();
  const today = todayKey();
  const nowIso = new Date().toISOString();
  const count = (q: PromiseLike<{ count: number | null; error: unknown }>) => Promise.resolve(q).then((r) => r.count ?? 0);

  const [totalMatches, todayMatches, liveMatches, streamingNow, premiumUsers, totalUsers] = await Promise.all([
    count(supabase.from("matches").select("*", { count: "exact", head: true })),
    count(
      supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .gte("kickoff_at", zonedInputToIso(`${today}T00:00`)!)
        .lt("kickoff_at", zonedInputToIso(`${addDays(today, 1)}T00:00`)!),
    ),
    count(supabase.from("matches").select("*", { count: "exact", head: true }).in("status", ["live", "halftime"])),
    count(
      supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .in("status", ["live", "halftime"])
        .not("stream_url", "is", null),
    ),
    count(
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_premium", true)
        .or(`premium_until.is.null,premium_until.gt.${nowIso}`),
    ),
    count(supabase.from("profiles").select("*", { count: "exact", head: true })),
  ]);

  return { totalMatches, todayMatches, liveMatches, streamingNow, premiumUsers, totalUsers };
}

export interface AdminMatchRow extends Match {
  league: Pick<League, "id" | "name">;
  home_team: Pick<Team, "id" | "name" | "short_name">;
  away_team: Pick<Team, "id" | "name" | "short_name">;
}

const ROW_SELECT = `*, league:leagues(id,name), home_team:teams!matches_home_team_id_fkey(id,name,short_name), away_team:teams!matches_away_team_id_fkey(id,name,short_name)`;

export type MatchListFilter = "upcoming" | "live" | "finished" | "all";

export async function listAdminMatches(filter: MatchListFilter, q?: string): Promise<AdminMatchRow[]> {
  const supabase = await createClient();
  let query = supabase.from("matches").select(ROW_SELECT).limit(200);

  if (filter === "live") query = query.in("status", ["live", "halftime"]).order("kickoff_at");
  else if (filter === "upcoming") query = query.in("status", ["scheduled", "postponed"]).order("kickoff_at");
  else if (filter === "finished") query = query.in("status", ["finished", "cancelled"]).order("kickoff_at", { ascending: false });
  else query = query.order("kickoff_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let rows = (data ?? []) as AdminMatchRow[];

  const term = q?.trim();
  if (term) {
    rows = rows.filter((m) =>
      [m.home_team.name, m.away_team.name, m.league.name, m.home_team.short_name ?? "", m.away_team.short_name ?? ""].some((s) =>
        s.toLowerCase().includes(term.toLowerCase()),
      ),
    );
  }
  return rows;
}

export interface AdminMatchDetails extends AdminMatchRow {
  stats: MatchStats;
  events: MatchEvent[];
}

export async function getAdminMatch(id: string): Promise<AdminMatchDetails | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const [{ data: match }, { data: events }] = await Promise.all([
    supabase.from("matches").select(ROW_SELECT).eq("id", id).maybeSingle(),
    supabase.from("match_events").select("*").eq("match_id", id).order("minute", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  if (!match) return null;
  return { ...(match as AdminMatchRow), stats: (match as { stats?: MatchStats }).stats ?? {}, events: (events ?? []) as MatchEvent[] };
}

export async function getCatalog(): Promise<{ leagues: League[]; teams: Team[] }> {
  const supabase = await createClient();
  const [{ data: leagues }, { data: teams }] = await Promise.all([
    supabase.from("leagues").select("*").order("priority").order("name"),
    supabase.from("teams").select("*").order("name"),
  ]);
  return { leagues: (leagues ?? []) as League[], teams: (teams ?? []) as Team[] };
}
