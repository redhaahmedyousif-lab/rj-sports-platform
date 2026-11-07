// أنواع البيانات المطابقة لمخطط Supabase (supabase/migrations/0001_init.sql)
// لاحقاً يمكن توليدها تلقائياً: npx supabase gen types typescript

export type MatchStatus =
  | "scheduled"
  | "live"
  | "halftime"
  | "finished"
  | "postponed"
  | "cancelled";

export interface League {
  id: string;
  name: string;
  country: string | null;
  logo_url: string | null;
  priority: number;
}

export interface Team {
  id: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
}

export interface Match {
  id: string;
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  kickoff_at: string; // ISO
  status: MatchStatus;
  minute: number | null;
  home_score: number;
  away_score: number;
  venue: string | null;
  round: string | null;
  stream_url: string | null;
  is_featured: boolean;
}

/** المباراة مع بيانات الدوري والفريقين (نتيجة الـ join) */
export interface MatchWithRelations extends Match {
  league: League;
  home_team: Team;
  away_team: Team;
}

export interface Profile {
  id: string;
  full_name: string | null;
  role: "user" | "admin";
  is_premium: boolean;
  premium_until: string | null;
}

// ---------------- تفاصيل المباراة ----------------

export type TeamSide = "home" | "away";

export type MatchEventType =
  | "goal"
  | "own_goal"
  | "penalty_goal"
  | "penalty_missed"
  | "yellow_card"
  | "second_yellow"
  | "red_card"
  | "substitution"
  | "var";

export interface MatchEvent {
  id: string;
  match_id: string;
  minute: number;
  extra_minute: number | null; // الوقت بدل الضائع: 45+2
  type: MatchEventType;
  team: TeamSide;
  player: string;
  /** صانع الهدف، أو اللاعب الخارج في التبديل */
  secondary_player: string | null;
  detail: string | null; // مثال: "إلغاء هدف — تسلل"
}

/** الإحصائيات بصيغة [المضيف, الضيف] */
export interface MatchStats {
  possession?: [number, number];
  xg?: [number, number];
  shots?: [number, number];
  shots_on_target?: [number, number];
  big_chances?: [number, number];
  corners?: [number, number];
  passes?: [number, number];
  pass_accuracy?: [number, number];
  fouls?: [number, number];
  yellow_cards?: [number, number];
  red_cards?: [number, number];
  offsides?: [number, number];
  saves?: [number, number];
}

export type PlayerPosition = "GK" | "DF" | "MF" | "FW";

export interface LineupPlayer {
  number: number;
  name: string;
  position: PlayerPosition;
  captain?: boolean;
  rating?: number | null;
}

export interface TeamLineup {
  formation: string; // "4-3-3"
  coach: string | null;
  /** بالترتيب: الحارس ثم الخطوط من الخلف للأمام (يمين → يسار داخل كل خط) */
  starting: LineupPlayer[];
  substitutes: LineupPlayer[];
}

export interface MatchLineups {
  home: TeamLineup;
  away: TeamLineup;
}

export interface MatchDetails extends MatchWithRelations {
  stats: MatchStats;
  lineups: MatchLineups | null;
  events: MatchEvent[];
}
