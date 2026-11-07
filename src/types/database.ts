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
