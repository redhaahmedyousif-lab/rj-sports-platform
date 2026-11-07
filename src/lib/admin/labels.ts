import type { MatchEventType, MatchStatus } from "@/types/database";

export const STATUS_LABEL: Record<MatchStatus, { text: string; cls: string }> = {
  scheduled: { text: "مجدولة", cls: "bg-surface-2 text-muted" },
  live: { text: "مباشر", cls: "bg-live/15 text-live" },
  halftime: { text: "استراحة", cls: "bg-live/15 text-live" },
  finished: { text: "انتهت", cls: "bg-surface-2 text-fg" },
  postponed: { text: "مؤجلة", cls: "bg-gold/15 text-gold" },
  cancelled: { text: "ملغاة", cls: "bg-surface-2 text-muted line-through" },
};

export const EVENT_LABEL: Record<MatchEventType, string> = {
  goal: "⚽ هدف",
  penalty_goal: "⚽ هدف من ركلة جزاء",
  own_goal: "⚽ هدف عكسي (يُحسب للفريق المختار)",
  penalty_missed: "❌ ركلة جزاء ضائعة",
  yellow_card: "🟨 بطاقة صفراء",
  second_yellow: "🟨🟥 إنذار ثانٍ (طرد)",
  red_card: "🟥 بطاقة حمراء",
  substitution: "🔁 تبديل",
  var: "📺 VAR",
};

export const STAT_LABEL: Record<string, string> = {
  possession: "الاستحواذ %",
  xg: "الأهداف المتوقعة xG",
  shots: "التسديدات",
  shots_on_target: "على المرمى",
  big_chances: "فرص محققة",
  corners: "الركنيات",
  passes: "التمريرات",
  pass_accuracy: "دقة التمرير %",
  fouls: "الأخطاء",
  yellow_cards: "بطاقات صفراء",
  red_cards: "بطاقات حمراء",
  offsides: "التسلل",
  saves: "التصديات",
};
