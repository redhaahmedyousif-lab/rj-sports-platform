import type { MatchDetails, MatchEvent } from "@/types/database";
import { EventIcon, eventLabel } from "./EventIcon";

const SCORING = new Set<MatchEvent["type"]>(["goal", "own_goal", "penalty_goal"]);

type Row =
  | { kind: "event"; event: MatchEvent; score?: [number, number] }
  | { kind: "marker"; label: string; score?: [number, number] };

export function formatMinute(e: Pick<MatchEvent, "minute" | "extra_minute">) {
  return e.extra_minute ? `${e.minute}+${e.extra_minute}'` : `${e.minute}'`;
}

/** يبني صفوف الخط الزمني مع النتيجة المتراكمة وعلامات الأشواط — الأحدث أولاً */
function buildRows(match: MatchDetails): Row[] {
  const rows: Row[] = [{ kind: "marker", label: "انطلاق المباراة" }];
  const score: [number, number] = [0, 0];
  let halftimeAdded = false;

  const addHalftime = () => {
    rows.push({ kind: "marker", label: "نهاية الشوط الأول", score: [...score] });
    halftimeAdded = true;
  };

  for (const event of match.events) {
    if (!halftimeAdded && event.minute > 45) addHalftime();
    if (SCORING.has(event.type)) {
      score[event.team === "home" ? 0 : 1]++;
      rows.push({ kind: "event", event, score: [...score] });
    } else {
      rows.push({ kind: "event", event });
    }
  }

  const secondHalfStarted = match.status === "finished" || (match.status === "live" && (match.minute ?? 0) > 45);
  if (!halftimeAdded && (match.status === "halftime" || secondHalfStarted)) addHalftime();
  if (match.status === "finished") rows.push({ kind: "marker", label: "نهاية المباراة", score: [...score] });

  return rows.reverse();
}

/** تسلسل أحداث المباراة: أحداث المضيف يميناً والضيف يساراً */
export function MatchTimeline({ match }: { match: MatchDetails }) {
  if (match.status === "scheduled") {
    return <EmptyPanel text="ستظهر أحداث المباراة هنا فور انطلاقها." />;
  }

  const rows = buildRows(match);

  return (
    <ol className="relative space-y-1 py-2">
      {/* الخط العمودي */}
      <span aria-hidden className="absolute inset-y-0 start-1/2 w-px -translate-x-1/2 bg-border rtl:translate-x-1/2" />

      {match.status === "live" && (
        <li className="relative flex justify-center pb-2">
          <span className="flex items-center gap-1.5 rounded-full bg-live/15 px-3 py-1 text-xs font-bold text-live ring-1 ring-live/30">
            <span className="size-1.5 animate-pulse rounded-full bg-live" />
            الدقيقة {match.minute}&apos;
          </span>
        </li>
      )}

      {rows.map((row, i) =>
        row.kind === "marker" ? (
          <li key={`m-${i}`} className="relative flex justify-center py-2">
            <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted ring-1 ring-border">
              {row.label}
              {row.score && (
                <span dir="ltr" className="mx-2 font-bold text-fg tabular-nums">
                  {row.score[1]} - {row.score[0]}
                </span>
              )}
            </span>
          </li>
        ) : (
          <TimelineEvent key={row.event.id} event={row.event} score={row.score} />
        ),
      )}
    </ol>
  );
}

function TimelineEvent({ event, score }: { event: MatchEvent; score?: [number, number] }) {
  const isHome = event.team === "home";
  const isGoal = Boolean(score);

  // الأيقونة دائماً بجانب خط المنتصف
  const content = (
    <div className={`flex min-w-0 items-center gap-2.5 ${isHome ? "flex-row-reverse text-end" : "flex-row"}`}>
      <EventIcon type={event.type} />
      <div className="min-w-0">
        <p className={`line-clamp-2 text-sm leading-snug ${isGoal ? "font-bold" : "font-semibold"}`}>
          {event.type === "substitution" ? <span className="text-brand">{event.player}</span> : event.player}
        </p>
        <p className="line-clamp-2 text-xs text-muted">
          {/* النتيجة بعد الهدف في السطر الثاني حتى لا تزاحم اسم اللاعب على الجوال */}
          {isGoal && score && (
            <span dir="ltr" className="me-1.5 inline-block rounded bg-surface-2 px-1.5 font-bold text-fg tabular-nums">
              {score[1]} - {score[0]}
            </span>
          )}
          {secondaryText(event)}
        </p>
      </div>
    </div>
  );

  return (
    <li className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-1.5">
      <div className="flex min-w-0 justify-end">{isHome && content}</div>
      <span
        className={`z-10 grid min-w-11 place-items-center rounded-full px-1.5 py-1 text-xs font-bold tabular-nums ring-1 ${
          isGoal ? "bg-brand text-brand-fg ring-brand" : "bg-surface text-muted ring-border"
        }`}
      >
        {formatMinute(event)}
      </span>
      <div className="flex min-w-0 justify-start">{!isHome && content}</div>
    </li>
  );
}

function secondaryText(e: MatchEvent): string {
  switch (e.type) {
    case "goal":
      return e.secondary_player ? `صناعة: ${e.secondary_player}` : "هدف";
    case "substitution":
      return `خروج: ${e.secondary_player ?? ""}`;
    case "var":
    case "penalty_missed":
      return e.detail ?? eventLabel(e.type);
    default:
      return eventLabel(e.type);
  }
}

export function EmptyPanel({ text }: { text: string }) {
  return <p className="py-12 text-center text-sm text-muted">{text}</p>;
}
