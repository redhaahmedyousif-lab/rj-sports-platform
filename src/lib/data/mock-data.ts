import type { League, MatchStatus, MatchWithRelations, Team } from "@/types/database";
import { addDays, todayKey } from "@/lib/utils/date";

/**
 * بيانات تجريبية تُستخدم عندما لا تكون Supabase مضبوطة.
 * المواعيد تُحسب نسبةً للوقت الحالي حتى تظهر دائماً مباريات "مباشرة".
 */

const leagues: League[] = [
  { id: "ucl", name: "دوري أبطال أوروبا", country: "أوروبا", logo_url: null, priority: 1 },
  { id: "epl", name: "الدوري الإنجليزي الممتاز", country: "إنجلترا", logo_url: null, priority: 2 },
  { id: "laliga", name: "الدوري الإسباني", country: "إسبانيا", logo_url: null, priority: 3 },
  { id: "spl", name: "دوري روشن السعودي", country: "السعودية", logo_url: null, priority: 4 },
  { id: "bhr", name: "دوري ناصر بن حمد الممتاز", country: "البحرين", logo_url: null, priority: 5 },
];

const t = (id: string, name: string, short: string): Team => ({
  id,
  name,
  short_name: short,
  logo_url: null,
});

const teams: Record<string, Team> = Object.fromEntries(
  [
    t("rma", "ريال مدريد", "RMA"),
    t("bar", "برشلونة", "BAR"),
    t("atm", "أتلتيكو مدريد", "ATM"),
    t("sev", "إشبيلية", "SEV"),
    t("mci", "مانشستر سيتي", "MCI"),
    t("liv", "ليفربول", "LIV"),
    t("ars", "آرسنال", "ARS"),
    t("che", "تشيلسي", "CHE"),
    t("mun", "مانشستر يونايتد", "MUN"),
    t("tot", "توتنهام", "TOT"),
    t("bay", "بايرن ميونخ", "BAY"),
    t("psg", "باريس سان جيرمان", "PSG"),
    t("int", "إنتر ميلان", "INT"),
    t("juv", "يوفنتوس", "JUV"),
    t("hil", "الهلال", "HIL"),
    t("nas", "النصر", "NAS"),
    t("itt", "الاتحاد", "ITT"),
    t("ahl", "الأهلي", "AHL"),
    t("muh", "المحرق", "MUH"),
    t("riff", "الرفاع", "RIF"),
    t("khal", "الخالدية", "KHA"),
    t("ahb", "الأهلي البحريني", "AHB"),
  ].map((team) => [team.id, team]),
);

/** [league, home, away, dayOffset, minutesFromNow | "HH:MM", stream?] */
type Fixture = [string, string, string, number, number | string, boolean?];

const fixtures: Fixture[] = [
  // اليوم — بعضها نسبي للوقت الحالي لضمان وجود مباريات مباشرة
  ["ucl", "rma", "mci", 0, -62, true],
  ["ucl", "bay", "psg", 0, -20, true],
  ["ucl", "int", "ars", 0, 95, true],
  ["epl", "liv", "che", 0, -140],
  ["epl", "mun", "tot", 0, -35, true],
  ["epl", "mci", "ars", 0, 180],
  ["laliga", "bar", "sev", 0, -50, true],
  ["laliga", "atm", "rma", 0, 240],
  ["spl", "hil", "nas", 0, 60, true],
  ["spl", "itt", "ahl", 0, -160],
  ["bhr", "muh", "riff", 0, 30],
  ["bhr", "khal", "ahb", 0, -75],
  // أمس
  ["epl", "ars", "liv", -1, "19:30"],
  ["laliga", "sev", "atm", -1, "22:00"],
  ["spl", "nas", "itt", -1, "21:00"],
  ["ucl", "juv", "bar", -1, "23:00"],
  // غداً
  ["epl", "che", "mun", 1, "17:00"],
  ["epl", "tot", "mci", 1, "19:30"],
  ["laliga", "rma", "bar", 1, "23:00", true],
  ["spl", "ahl", "hil", 1, "21:00"],
  ["bhr", "riff", "khal", 1, "18:30"],
];

/** رقم ثابت من نص (لتوليد نتائج ثابتة بين التحديثات) */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function kickoffFor(dayOffset: number, when: number | string): Date {
  if (typeof when === "number") {
    // تقريب "الآن" لأقرب 5 دقائق ليبقى الموعد ثابتاً خلال التحديث التلقائي
    const now = Math.floor(Date.now() / 300_000) * 300_000;
    return new Date(now + when * 60_000);
  }
  // توقيت ثابت بتوقيت البحرين (UTC+3)
  const key = addDays(todayKey(), dayOffset);
  return new Date(`${key}T${when}:00+03:00`);
}

function liveState(kickoff: Date): { status: MatchStatus; minute: number | null; progress: number } {
  const elapsed = (Date.now() - kickoff.getTime()) / 60_000;
  if (elapsed < 0) return { status: "scheduled", minute: null, progress: 0 };
  if (elapsed < 45) return { status: "live", minute: Math.max(1, Math.floor(elapsed)), progress: elapsed / 90 };
  if (elapsed < 60) return { status: "halftime", minute: 45, progress: 0.5 };
  if (elapsed < 108) return { status: "live", minute: Math.min(90, Math.floor(elapsed - 15)), progress: (elapsed - 15) / 90 };
  return { status: "finished", minute: 90, progress: 1 };
}

export function getMockMatches(): MatchWithRelations[] {
  const leagueById = Object.fromEntries(leagues.map((l) => [l.id, l]));

  return fixtures.map(([leagueId, home, away, dayOffset, when, stream], index) => {
    const id = `${leagueId}-${home}-${away}-${dayOffset}`;
    const kickoff = kickoffFor(dayOffset, when);
    const { status, minute, progress } = liveState(kickoff);
    const seed = hash(id);
    const finalHome = seed % 4;
    const finalAway = (seed >>> 3) % 3;

    return {
      id,
      league_id: leagueId,
      home_team_id: home,
      away_team_id: away,
      kickoff_at: kickoff.toISOString(),
      status,
      minute,
      home_score: Math.floor(finalHome * progress),
      away_score: Math.floor(finalAway * progress),
      venue: null,
      round: `الجولة ${(seed % 30) + 1}`,
      stream_url: stream ? "mock://stream" : null,
      is_featured: index === 0,
      league: leagueById[leagueId],
      home_team: teams[home],
      away_team: teams[away],
    };
  });
}
