import type { LineupPlayer, MatchDetails, MatchEvent, Team, TeamLineup, TeamSide } from "@/types/database";
import { TeamCrest } from "@/components/matches/TeamCrest";
import { BallIcon } from "@/components/ui/icons";
import { EmptyPanel, formatMinute } from "./MatchTimeline";

/** أحداث كل لاعب (أهداف، بطاقات، تبديل) لعرضها على أيقونته */
interface PlayerMarks {
  goals: number;
  ownGoals: number;
  yellow: boolean;
  red: boolean;
  subOff?: string;
  subOn?: string;
}

const markKey = (side: TeamSide, name: string) => `${side}:${name}`;

/** المفتاح يشمل الفريق حتى لا يختلط لاعبان بنفس الاسم في الفريقين */
function collectMarks(events: MatchEvent[]): Map<string, PlayerMarks> {
  const marks = new Map<string, PlayerMarks>();
  const get = (side: TeamSide, name: string) => {
    const key = markKey(side, name);
    if (!marks.has(key)) marks.set(key, { goals: 0, ownGoals: 0, yellow: false, red: false });
    return marks.get(key)!;
  };
  for (const e of events) {
    if (e.type === "goal" || e.type === "penalty_goal") get(e.team, e.player).goals++;
    // الهدف العكسي يُسجَّل لصالح e.team لكن اللاعب من الفريق الآخر
    if (e.type === "own_goal") get(e.team === "home" ? "away" : "home", e.player).ownGoals++;
    if (e.type === "yellow_card") get(e.team, e.player).yellow = true;
    if (e.type === "red_card" || e.type === "second_yellow") get(e.team, e.player).red = true;
    if (e.type === "substitution") {
      get(e.team, e.player).subOn = formatMinute(e);
      if (e.secondary_player) get(e.team, e.secondary_player).subOff = formatMinute(e);
    }
  }
  return marks;
}

/** يقسم اللاعبين الأساسيين إلى خطوط حسب الخطة: [حارس, ...الخطة] */
function toRows(lineup: TeamLineup): LineupPlayer[][] {
  const counts = [1, ...lineup.formation.split("-").map(Number)];
  const rows: LineupPlayer[][] = [];
  let i = 0;
  for (const count of counts) {
    rows.push(lineup.starting.slice(i, i + count));
    i += count;
  }
  return rows;
}

const shortName = (name: string) => {
  const parts = name.split(" ");
  return parts.length > 1 ? parts.slice(1).join(" ") : name;
};

export function Lineups({ match }: { match: MatchDetails }) {
  if (!match.lineups) {
    return <EmptyPanel text="التشكيلة الرسمية تُعلن قبل ساعة من انطلاق المباراة." />;
  }

  const { home, away } = match.lineups;
  const marks = collectMarks(match.events);

  return (
    <div className="space-y-6 py-2">
      {/* الملعب */}
      <div className="overflow-hidden rounded-xl ring-1 ring-border">
        <TeamBar team={match.home_team} lineup={home} side="home" />
        <Pitch home={home} away={away} marks={marks} />
        <TeamBar team={match.away_team} lineup={away} side="away" />
      </div>

      {/* البدلاء والمدربون */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Bench team={match.home_team} lineup={home} side="home" marks={marks} />
        <Bench team={match.away_team} lineup={away} side="away" marks={marks} />
      </div>
    </div>
  );
}

function TeamBar({ team, lineup, side }: { team: Team; lineup: TeamLineup; side: TeamSide }) {
  return (
    <div className="flex items-center justify-between bg-surface-2 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <TeamCrest team={team} size={22} />
        <span className="text-sm font-bold">{team.name}</span>
      </div>
      <span
        dir="ltr"
        className="rounded-md px-2 py-0.5 text-xs font-bold text-black"
        style={{ background: side === "home" ? "var(--color-home)" : "var(--color-away)" }}
      >
        {lineup.formation}
      </span>
    </div>
  );
}

/** ملعب عمودي: المضيف في النصف العلوي (حارسه أعلى)، والضيف في السفلي */
function Pitch({ home, away, marks }: { home: TeamLineup; away: TeamLineup; marks: Map<string, PlayerMarks> }) {
  const homeRows = toRows(home);
  const awayRows = toRows(away).reverse(); // الحارس في الأسفل

  return (
    <div
      className="relative"
      style={{
        background:
          "repeating-linear-gradient(0deg, var(--color-pitch) 0 10%, color-mix(in oklab, var(--color-pitch) 88%, white) 10% 20%)",
      }}
    >
      <PitchLines />
      <div className="relative flex flex-col">
        <Half rows={homeRows} side="home" marks={marks} />
        <Half rows={awayRows} side="away" marks={marks} />
      </div>
    </div>
  );
}

function Half({ rows, side, marks }: { rows: LineupPlayer[][]; side: TeamSide; marks: Map<string, PlayerMarks> }) {
  return (
    <div className="flex flex-col justify-around gap-1 py-3 sm:gap-3 sm:py-5" style={{ minHeight: 300 }}>
      {rows.map((row, i) => (
        <div key={i} className="flex justify-around px-1">
          {row.map((player) => (
            <PlayerNode key={player.number} player={player} side={side} marks={marks.get(markKey(side, player.name))} />
          ))}
        </div>
      ))}
    </div>
  );
}

function PlayerNode({ player, side, marks }: { player: LineupPlayer; side: TeamSide; marks?: PlayerMarks }) {
  const color = side === "home" ? "var(--color-home)" : "var(--color-away)";
  const isGk = player.position === "GK";

  return (
    <div className="flex w-16 flex-col items-center gap-0.5 sm:w-20" title={player.name}>
      <div className="relative">
        <span
          className="grid size-9 place-items-center rounded-full text-sm font-extrabold text-black shadow-md ring-2 ring-white/80 sm:size-10"
          style={{ background: isGk ? "#facc15" : color }}
        >
          {player.number}
        </span>

        {player.rating != null && (
          <span
            className={`absolute -top-1.5 -end-3 rounded px-1 text-[10px] font-bold text-white ${ratingColor(player.rating)}`}
          >
            {player.rating.toFixed(1)}
          </span>
        )}
        {player.captain && (
          <span className="absolute -bottom-1 -end-1.5 grid size-4 place-items-center rounded-full bg-white text-[9px] font-black text-black">
            C
          </span>
        )}
        {/* الأحداث على يسار الدائرة */}
        <div className="absolute -start-3 -bottom-1 flex flex-col gap-0.5">
          {marks?.goals ? (
            <span className="flex items-center rounded-full bg-white px-0.5 text-black">
              <BallIcon width={11} height={11} />
              {marks.goals > 1 && <span className="text-[9px] font-bold">{marks.goals}</span>}
            </span>
          ) : null}
          {marks?.red ? (
            <span className="h-3 w-2 rounded-[1px] bg-live" />
          ) : marks?.yellow ? (
            <span className="h-3 w-2 rounded-[1px] bg-yellow-400" />
          ) : null}
        </div>
        {marks?.subOff && (
          <span className="absolute -top-1.5 -start-3 rounded bg-black/70 px-0.5 text-[9px] font-bold text-live" title={`خرج ${marks.subOff}`}>
            ↓{marks.subOff}
          </span>
        )}
      </div>
      <span className="line-clamp-1 max-w-full rounded bg-black/40 px-1 text-center text-[10px] font-semibold text-white sm:text-xs">
        {shortName(player.name)}
      </span>
    </div>
  );
}

function ratingColor(r: number) {
  if (r >= 8) return "bg-blue-600";
  if (r >= 7) return "bg-green-600";
  if (r >= 6) return "bg-orange-500";
  return "bg-red-600";
}

/** خطوط الملعب (SVG بنسب مئوية) */
function PitchLines() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 100 150">
      <g fill="none" stroke="rgba(255,255,255,.35)" strokeWidth=".4" vectorEffect="non-scaling-stroke">
        <rect x="3" y="2" width="94" height="146" />
        <line x1="3" y1="75" x2="97" y2="75" />
        <ellipse cx="50" cy="75" rx="13" ry="9" />
        <rect x="22" y="2" width="56" height="20" />
        <rect x="36" y="2" width="28" height="7" />
        <rect x="22" y="128" width="56" height="20" />
        <rect x="36" y="141" width="28" height="7" />
      </g>
    </svg>
  );
}

function Bench({
  team,
  lineup,
  side,
  marks,
}: {
  team: Team;
  lineup: TeamLineup;
  side: TeamSide;
  marks: Map<string, PlayerMarks>;
}) {
  return (
    <div className="rounded-xl bg-surface-2/50 p-4 ring-1 ring-border">
      <div className="mb-3 flex items-center gap-2">
        <TeamCrest team={team} size={20} />
        <h3 className="text-sm font-bold">بدلاء {team.name}</h3>
      </div>
      <ul className="space-y-2 text-sm">
        {lineup.substitutes.map((p) => {
          const subOn = marks.get(markKey(side, p.name))?.subOn;
          return (
            <li key={p.number} className="flex items-center gap-3">
              <span className="w-6 text-center text-xs font-bold text-muted tabular-nums">{p.number}</span>
              <span className="flex-1 truncate">{p.name}</span>
              <span className="text-xs text-muted">{POSITION_LABEL[p.position]}</span>
              {subOn && <span className="text-xs font-bold text-brand">↑{subOn}</span>}
            </li>
          );
        })}
      </ul>
      {lineup.coach && (
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
          المدرب: <span className="font-semibold text-fg">{lineup.coach}</span>
        </p>
      )}
    </div>
  );
}

const POSITION_LABEL: Record<LineupPlayer["position"], string> = {
  GK: "حارس",
  DF: "مدافع",
  MF: "وسط",
  FW: "مهاجم",
};
