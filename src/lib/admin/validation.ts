import type { MatchEventType, MatchStats, MatchStatus, TeamSide } from "@/types/database";
import { zonedInputToIso } from "@/lib/utils/zoned-time";

export type FieldErrors = Partial<Record<string, string>>;
type Result<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MATCH_STATUSES: MatchStatus[] = ["scheduled", "live", "halftime", "finished", "postponed", "cancelled"];
export const EVENT_TYPES: MatchEventType[] = [
  "goal",
  "penalty_goal",
  "own_goal",
  "penalty_missed",
  "yellow_card",
  "second_yellow",
  "red_card",
  "substitution",
  "var",
];

const str = (v: FormDataEntryValue | null | undefined) => (typeof v === "string" ? v.trim() : "");

function intIn(v: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(v)) return null;
  const n = Number(v);
  return n >= min && n <= max ? n : null;
}

/**
 * رابط البث: http(s) فقط (يمنع javascript: وغيرها).
 * http مسموح فقط للتطوير المحلي (localhost).
 */
export function validateStreamUrl(value: string): string | null | false {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) return false;
  if (value.length > 2000) return false;
  return url.toString();
}

export interface MatchInput {
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  kickoff_at: string;
  status: MatchStatus;
  venue: string | null;
  round: string | null;
  stream_url: string | null;
  is_featured: boolean;
}

export function parseMatchForm(fd: { get(name: string): FormDataEntryValue | null }): Result<MatchInput> {
  const errors: FieldErrors = {};
  const league_id = str(fd.get("league_id"));
  const home_team_id = str(fd.get("home_team_id"));
  const away_team_id = str(fd.get("away_team_id"));
  const kickoff = zonedInputToIso(str(fd.get("kickoff_at")));
  const status = str(fd.get("status")) as MatchStatus;
  const stream = validateStreamUrl(str(fd.get("stream_url")));

  if (!UUID.test(league_id)) errors.league_id = "اختر البطولة";
  if (!UUID.test(home_team_id)) errors.home_team_id = "اختر الفريق المضيف";
  if (!UUID.test(away_team_id)) errors.away_team_id = "اختر الفريق الضيف";
  if (UUID.test(home_team_id) && home_team_id === away_team_id) errors.away_team_id = "لا يمكن أن يلعب الفريق ضد نفسه";
  if (!kickoff) errors.kickoff_at = "أدخل موعد الانطلاق";
  if (!MATCH_STATUSES.includes(status)) errors.status = "حالة غير صحيحة";
  if (stream === false) errors.stream_url = "رابط البث يجب أن يبدأ بـ https://";

  const venue = str(fd.get("venue")).slice(0, 120) || null;
  const round = str(fd.get("round")).slice(0, 60) || null;

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      league_id,
      home_team_id,
      away_team_id,
      kickoff_at: kickoff!,
      status,
      venue,
      round,
      stream_url: stream || null,
      is_featured: fd.get("is_featured") === "on",
    },
  };
}

export interface EventInput {
  match_id: string;
  type: MatchEventType;
  team: TeamSide;
  minute: number;
  extra_minute: number | null;
  player: string;
  secondary_player: string | null;
  detail: string | null;
}

export function parseEventForm(fd: { get(name: string): FormDataEntryValue | null }): Result<EventInput> {
  const errors: FieldErrors = {};
  const match_id = str(fd.get("match_id"));
  const type = str(fd.get("type")) as MatchEventType;
  const team = str(fd.get("team")) as TeamSide;
  const minute = intIn(str(fd.get("minute")), 0, 130);
  const extraRaw = str(fd.get("extra_minute"));
  const extra_minute = extraRaw ? intIn(extraRaw, 1, 30) : null;
  const player = str(fd.get("player")).slice(0, 80);
  const secondary_player = str(fd.get("secondary_player")).slice(0, 80) || null;

  if (!UUID.test(match_id)) errors.match_id = "مباراة غير صحيحة";
  if (!EVENT_TYPES.includes(type)) errors.type = "اختر نوع الحدث";
  if (team !== "home" && team !== "away") errors.team = "اختر الفريق";
  if (minute === null) errors.minute = "الدقيقة بين 0 و 130";
  if (extraRaw && extra_minute === null) errors.extra_minute = "الوقت بدل الضائع بين 1 و 30";
  if (!player) errors.player = type === "substitution" ? "أدخل اسم اللاعب الداخل" : "أدخل اسم اللاعب";
  if (type === "substitution" && !secondary_player) errors.secondary_player = "أدخل اسم اللاعب الخارج";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      match_id,
      type,
      team,
      minute: minute!,
      extra_minute,
      player,
      secondary_player,
      detail: str(fd.get("detail")).slice(0, 200) || null,
    },
  };
}

export const STAT_KEYS = [
  "possession",
  "xg",
  "shots",
  "shots_on_target",
  "big_chances",
  "corners",
  "passes",
  "pass_accuracy",
  "fouls",
  "yellow_cards",
  "red_cards",
  "offsides",
  "saves",
] as const satisfies readonly (keyof MatchStats)[];

/** الإحصائيات: home_<key> / away_<key>؛ الحقول الفارغة تُحذف */
export function parseStatsForm(fd: { get(name: string): FormDataEntryValue | null }): Result<MatchStats> {
  const stats: MatchStats = {};
  const errors: FieldErrors = {};
  for (const key of STAT_KEYS) {
    const h = str(fd.get(`home_${key}`));
    const a = str(fd.get(`away_${key}`));
    if (!h && !a) continue;
    const max = key === "possession" || key === "pass_accuracy" ? 100 : 2000;
    const parse = (v: string) => {
      const n = Number(v || "0");
      return Number.isFinite(n) && n >= 0 && n <= max ? (key === "xg" ? Math.round(n * 100) / 100 : Math.round(n)) : null;
    };
    const hv = parse(h);
    const av = parse(a);
    if (hv === null || av === null) {
      errors[key] = "قيمة غير صحيحة";
      continue;
    }
    stats[key] = [hv, av];
  }
  if (stats.possession && stats.possession[0] + stats.possession[1] !== 100) errors.possession = "مجموع الاستحواذ يجب أن يساوي 100";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data: stats };
}
