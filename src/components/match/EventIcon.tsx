import type { MatchEventType } from "@/types/database";
import { BallIcon } from "@/components/ui/icons";

const LABELS: Record<MatchEventType, string> = {
  goal: "هدف",
  own_goal: "هدف عكسي",
  penalty_goal: "هدف من ركلة جزاء",
  penalty_missed: "ركلة جزاء ضائعة",
  yellow_card: "بطاقة صفراء",
  second_yellow: "بطاقة صفراء ثانية (طرد)",
  red_card: "بطاقة حمراء",
  substitution: "تبديل",
  var: "تقنية الفيديو VAR",
};

export function eventLabel(type: MatchEventType) {
  return LABELS[type];
}

/** أيقونة نوع الحدث */
export function EventIcon({ type, size = 18 }: { type: MatchEventType; size?: number }) {
  const card = (color: string, offset = 0) => (
    <span
      className="absolute rounded-[2px]"
      style={{ width: size * 0.55, height: size * 0.75, background: color, insetInlineStart: offset, top: offset }}
    />
  );

  let icon: React.ReactNode;
  switch (type) {
    case "goal":
    case "penalty_goal":
      icon = <BallIcon width={size} height={size} className="text-fg" />;
      break;
    case "own_goal":
      icon = <BallIcon width={size} height={size} className="text-live" />;
      break;
    case "penalty_missed":
      icon = (
        <span className="relative text-muted">
          <BallIcon width={size} height={size} />
          <span className="absolute inset-0 m-auto h-0.5 w-full rotate-45 bg-live" />
        </span>
      );
      break;
    case "yellow_card":
      icon = <span className="relative block" style={{ width: size * 0.55, height: size * 0.75 }}>{card("#facc15")}</span>;
      break;
    case "red_card":
      icon = <span className="relative block" style={{ width: size * 0.55, height: size * 0.75 }}>{card("#ef4444")}</span>;
      break;
    case "second_yellow":
      icon = (
        <span className="relative block" style={{ width: size * 0.75, height: size * 0.9 }}>
          {card("#facc15")}
          {card("#ef4444", size * 0.18)}
        </span>
      );
      break;
    case "substitution":
      icon = (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 4v14m0 0-3-3m3 3 3-3" stroke="#22c55e" />
          <path d="M17 20V6m0 0-3 3m3-3 3 3" stroke="#ef4444" />
        </svg>
      );
      break;
    case "var":
      icon = <span className="rounded bg-surface-2 px-1 text-[9px] font-black tracking-tight text-fg ring-1 ring-border">VAR</span>;
      break;
  }

  return (
    <span role="img" aria-label={LABELS[type]} title={LABELS[type]} className="inline-grid shrink-0 place-items-center" style={{ minWidth: size, height: size }}>
      {icon}
    </span>
  );
}
