import type {
  League,
  LineupPlayer,
  MatchDetails,
  MatchEvent,
  MatchLineups,
  MatchStats,
  MatchStatus,
  MatchWithRelations,
  PlayerPosition,
  Team,
  TeamLineup,
  TeamSide,
} from "@/types/database";
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

/** مولّد أرقام عشوائية ثابت (mulberry32) — نفس البذرة تعطي نفس النتائج دائماً */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (r: () => number, min: number, max: number) => min + Math.floor(r() * (max - min + 1));

interface Clock {
  status: MatchStatus;
  minute: number | null;
  /** آخر دقيقة "مرئية" من أحداث المباراة: -1 لم تبدأ، 999 انتهت */
  visibleUntil: number;
}

function clockFor(kickoff: Date): Clock {
  const elapsed = (Date.now() - kickoff.getTime()) / 60_000;
  if (elapsed < 0) return { status: "scheduled", minute: null, visibleUntil: -1 };
  if (elapsed < 47) {
    const minute = Math.max(1, Math.min(45, Math.floor(elapsed) + 1));
    return { status: "live", minute, visibleUntil: minute };
  }
  if (elapsed < 62) return { status: "halftime", minute: 45, visibleUntil: 45.9 };
  if (elapsed < 110) {
    const minute = Math.min(90, Math.floor(elapsed - 16) + 1);
    return { status: "live", minute, visibleUntil: minute };
  }
  return { status: "finished", minute: 90, visibleUntil: 999 };
}

// ---------------- التشكيلات ----------------

const FIRST_NAMES = ["أحمد", "محمد", "علي", "يوسف", "عمر", "خالد", "سالم", "حسن", "كريم", "ماركو", "لوكاس", "دانيال", "جواو", "ليو", "ماتيو", "نيكولاس", "تياغو", "رافا", "إيفان", "سامي"];
const LAST_NAMES = ["الحربي", "سيلفا", "فرنانديز", "مارتينيز", "كوستا", "أوليفيرا", "رودريغيز", "مولر", "دياز", "سانتوس", "بيريز", "غارسيا", "الدوسري", "الشهري", "العمري", "يوسف", "بنزرتي", "كامارا", "ديالو", "تراوري"];
const COACHES = ["كارلو أنشيلوتي", "بيب غوارديولا", "يورغن كلوب", "ميكيل أرتيتا", "تشابي ألونسو", "جورجي جيسوس", "هانزي فليك", "لويس إنريكي"];
const FORMATIONS = ["4-3-3", "4-2-3-1", "4-4-2", "3-5-2", "4-1-4-1"];

function positionFor(line: number, lines: number): PlayerPosition {
  if (line === 0) return "GK";
  if (line === 1) return "DF";
  if (line === lines - 1) return "FW";
  return "MF";
}

function buildLineup(teamId: string): TeamLineup {
  const seed = hash(teamId);
  const r = rng(seed);
  const formation = FORMATIONS[seed % FORMATIONS.length];
  const rows = [1, ...formation.split("-").map(Number)];
  const usedNumbers = new Set<number>();

  const players: LineupPlayer[] = Array.from({ length: 18 }, (_, i) => {
    let number = i === 0 ? 1 : i === 11 ? 13 : int(r, 2, 40);
    while (usedNumbers.has(number)) number++;
    usedNumbers.add(number);
    return {
      number,
      name: `${FIRST_NAMES[(seed + i * 7) % 20]} ${LAST_NAMES[(seed * 3 + i * 11) % 20]}`,
      position: "MF",
    };
  });

  let index = 0;
  rows.forEach((count, line) => {
    for (let k = 0; k < count; k++) players[index++].position = positionFor(line, rows.length);
  });
  players[int(r, 1, 10)].captain = true;
  // البدلاء: حارس + 6 لاعبين
  const subPositions: PlayerPosition[] = ["GK", "DF", "DF", "MF", "MF", "FW", "FW"];
  players.slice(11).forEach((p, i) => (p.position = subPositions[i]));

  return {
    formation,
    coach: COACHES[seed % COACHES.length],
    starting: players.slice(0, 11),
    substitutes: players.slice(11),
  };
}

// ---------------- الأحداث ----------------

type RawEvent = Omit<MatchEvent, "id" | "match_id">;

function pick<T>(r: () => number, list: T[]): T {
  return list[Math.floor(r() * list.length)];
}

/** أحداث المباراة كاملة (حتى الدقيقة 90) — تُفلتر لاحقاً حسب الوقت الحالي */
function buildEvents(seed: number, lineups: MatchLineups, goals: [number, number]): RawEvent[] {
  const r = rng(seed);
  const events: RawEvent[] = [];
  const sides: TeamSide[] = ["home", "away"];

  sides.forEach((side, s) => {
    const lineup = lineups[side];
    const attackers = lineup.starting.filter((p) => p.position === "FW" || p.position === "MF");
    const defenders = lineups[side === "home" ? "away" : "home"].starting.filter((p) => p.position === "DF");

    // الأهداف
    for (let g = 0; g < goals[s]; g++) {
      const roll = r();
      const minute = int(r, 3, 92);
      const base = { team: side, detail: null, extra_minute: null as number | null, minute: Math.min(minute, 90) };
      if (minute > 90) base.extra_minute = minute - 90;
      if (roll < 0.1) {
        events.push({ ...base, type: "own_goal", player: pick(r, defenders).name, secondary_player: null });
      } else if (roll < 0.22) {
        events.push({ ...base, type: "penalty_goal", player: pick(r, attackers).name, secondary_player: null });
      } else {
        const scorer = pick(r, attackers);
        const assist = pick(r, lineup.starting.filter((p) => p !== scorer && p.position !== "GK"));
        events.push({ ...base, type: "goal", player: scorer.name, secondary_player: r() < 0.8 ? assist.name : null });
      }
    }

    // البطاقات الصفراء
    const cards = int(r, 0, 3);
    for (let c = 0; c < cards; c++) {
      events.push({
        team: side,
        minute: int(r, 12, 89),
        extra_minute: null,
        type: "yellow_card",
        player: pick(r, lineup.starting.slice(1)).name,
        secondary_player: null,
        detail: null,
      });
    }

    // التبديلات: 3 تبديلات بين الدقيقة 55 و 85
    const outs = [...lineup.starting.slice(1)].sort(() => r() - 0.5).slice(0, 3);
    outs.forEach((out, i) => {
      events.push({
        team: side,
        minute: int(r, 55 + i * 8, 62 + i * 8),
        extra_minute: null,
        type: "substitution",
        player: lineup.substitutes[i + 1].name,
        secondary_player: out.name,
        detail: null,
      });
    });
  });

  // حدث نادر: VAR أو ركلة جزاء ضائعة
  if (r() < 0.35) {
    const side = pick(r, sides);
    events.push({
      team: side,
      minute: int(r, 20, 80),
      extra_minute: null,
      type: r() < 0.5 ? "var" : "penalty_missed",
      player: pick(r, lineups[side].starting.slice(6)).name,
      secondary_player: null,
      detail: "مراجعة الفيديو — إلغاء الهدف بداعي التسلل",
    });
  }

  // بطاقة صفراء ثانية = طرد (نادراً)
  if (r() < 0.15) {
    const card = events.find((e) => e.type === "yellow_card" && e.minute < 70);
    if (card) events.push({ ...card, minute: int(r, card.minute + 5, 89), type: "second_yellow" });
  }

  return events.sort((a, b) => a.minute - b.minute || (a.extra_minute ?? 0) - (b.extra_minute ?? 0));
}

function isVisible(e: RawEvent, clock: Clock) {
  if (clock.visibleUntil === 999) return true;
  if (e.extra_minute && e.minute === 90) return false;
  return e.minute + (e.extra_minute ? 0.5 : 0) <= clock.visibleUntil;
}

const SCORING: MatchEvent["type"][] = ["goal", "own_goal", "penalty_goal"];

function countGoals(events: RawEvent[], side: TeamSide) {
  return events.filter((e) => e.team === side && SCORING.includes(e.type)).length;
}

// ---------------- الإحصائيات ----------------

function buildStats(seed: number, clock: Clock, events: RawEvent[]): MatchStats {
  if (clock.status === "scheduled") return {};
  const r = rng(seed ^ 0x9e3779b9);
  const p = Math.min(1, (clock.visibleUntil === 999 ? 90 : clock.visibleUntil) / 90);
  const homePoss = int(r, 36, 64);
  const scale = (min: number, max: number) => Math.round(int(r, min, max) * p);
  const pair = (min: number, max: number): [number, number] => [scale(min, max), scale(min, max)];

  const shots = pair(6, 20);
  const onTarget: [number, number] = [
    Math.min(shots[0], Math.round(shots[0] * (0.25 + r() * 0.3))),
    Math.min(shots[1], Math.round(shots[1] * (0.25 + r() * 0.3))),
  ];
  const passes: [number, number] = [
    Math.round((300 + homePoss * 6) * p),
    Math.round((300 + (100 - homePoss) * 6) * p),
  ];
  const count = (side: TeamSide, types: MatchEvent["type"][]) =>
    events.filter((e) => e.team === side && types.includes(e.type)).length;

  return {
    possession: [homePoss, 100 - homePoss],
    xg: [+(onTarget[0] * 0.28 + r() * 0.4).toFixed(2), +(onTarget[1] * 0.28 + r() * 0.4).toFixed(2)],
    shots,
    shots_on_target: onTarget,
    big_chances: [Math.round(onTarget[0] / 2), Math.round(onTarget[1] / 2)],
    corners: pair(2, 10),
    passes,
    pass_accuracy: [int(r, 76, 92), int(r, 72, 90)],
    fouls: pair(6, 16),
    yellow_cards: [count("home", ["yellow_card", "second_yellow"]), count("away", ["yellow_card", "second_yellow"])],
    red_cards: [count("home", ["second_yellow", "red_card"]), count("away", ["second_yellow", "red_card"])],
    offsides: pair(0, 5),
    saves: [onTarget[1] - countGoals(events, "away"), onTarget[0] - countGoals(events, "home")].map((n) =>
      Math.max(0, n),
    ) as [number, number],
  };
}

// ---------------- التجميع ----------------

const VENUES: Record<string, string> = {
  rma: "سانتياغو برنابيو",
  bar: "سبوتيفاي كامب نو",
  atm: "ميتروبوليتانو",
  sev: "رامون سانشيز بيزخوان",
  mci: "ملعب الاتحاد",
  liv: "آنفيلد",
  ars: "الإمارات",
  che: "ستامفورد بريدج",
  mun: "أولد ترافورد",
  tot: "ملعب توتنهام هوتسبير",
  bay: "أليانز أرينا",
  int: "جوزيبي مياتزا",
  juv: "أليانز ستاديوم",
  hil: "المملكة أرينا",
  nas: "الأول بارك",
  itt: "مدينة الملك عبدالله",
  ahl: "مدينة الملك عبدالله",
  muh: "استاد البحرين الوطني",
  khal: "استاد مدينة خليفة",
  riff: "استاد البحرين الوطني",
};

/** رابط بث تجريبي للمباريات التي لها بث (قابل للتغيير من env) */
const DEMO_STREAM_URL =
  process.env.NEXT_PUBLIC_DEMO_STREAM_URL || "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

function buildMatch(fixture: Fixture, index: number): MatchDetails {
  const [leagueId, home, away, dayOffset, when, stream] = fixture;
  const id = `${leagueId}-${home}-${away}-${dayOffset}`;
  const kickoff = kickoffFor(dayOffset, when);
  const clock = clockFor(kickoff);
  const seed = hash(id);
  const lineups: MatchLineups = { home: buildLineup(home), away: buildLineup(away) };
  const allEvents = buildEvents(seed, lineups, [seed % 4, (seed >>> 3) % 3]);
  const events = allEvents.filter((e) => isVisible(e, clock));

  // التشكيلات تُعلن قبل المباراة بساعة
  const lineupsAnnounced = kickoff.getTime() - Date.now() < 60 * 60_000;
  const showRatings = clock.status !== "scheduled";
  const r = rng(seed ^ 0x51ed);
  const withRatings = (l: TeamLineup): TeamLineup => ({
    ...l,
    starting: l.starting.map((p) => ({ ...p, rating: showRatings ? +(5.8 + r() * 2.8).toFixed(1) : null })),
  });

  return {
    id,
    league_id: leagueId,
    home_team_id: home,
    away_team_id: away,
    kickoff_at: kickoff.toISOString(),
    status: clock.status,
    minute: clock.minute,
    home_score: countGoals(events, "home"),
    away_score: countGoals(events, "away"),
    venue: VENUES[home] ?? null,
    round: `الجولة ${(seed % 30) + 1}`,
    stream_url: stream ? DEMO_STREAM_URL : null,
    is_featured: index === 0,
    league: leagues.find((l) => l.id === leagueId)!,
    home_team: teams[home],
    away_team: teams[away],
    stats: buildStats(seed, clock, events),
    lineups: lineupsAnnounced ? { home: withRatings(lineups.home), away: withRatings(lineups.away) } : null,
    events: events.map((e, i) => ({ ...e, id: `${id}-e${i}`, match_id: id })),
  };
}

export function getMockMatches(): MatchWithRelations[] {
  return fixtures.map(buildMatch).map(({ stats, lineups, events, ...match }) => match);
}

export function getMockMatch(id: string): MatchDetails | null {
  const index = fixtures.findIndex(([l, h, a, d]) => `${l}-${h}-${a}-${d}` === id);
  return index === -1 ? null : buildMatch(fixtures[index], index);
}
