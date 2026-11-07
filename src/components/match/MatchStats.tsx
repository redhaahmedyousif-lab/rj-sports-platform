import type { MatchDetails, MatchStats as Stats } from "@/types/database";
import { isLive } from "@/lib/utils/match";
import { TeamCrest } from "@/components/matches/TeamCrest";
import { EmptyPanel } from "./MatchTimeline";

type StatKey = keyof Stats;

const GROUPS: { title: string; rows: { key: StatKey; label: string; suffix?: string; decimals?: boolean }[] }[] = [
  {
    title: "أبرز الإحصائيات",
    rows: [
      { key: "xg", label: "الأهداف المتوقعة (xG)", decimals: true },
      { key: "shots", label: "إجمالي التسديدات" },
      { key: "shots_on_target", label: "تسديدات على المرمى" },
      { key: "big_chances", label: "فرص محققة" },
      { key: "corners", label: "ركلات ركنية" },
    ],
  },
  {
    title: "التمرير",
    rows: [
      { key: "passes", label: "التمريرات" },
      { key: "pass_accuracy", label: "دقة التمرير", suffix: "%" },
    ],
  },
  {
    title: "الدفاع والانضباط",
    rows: [
      { key: "saves", label: "تصديات الحارس" },
      { key: "fouls", label: "الأخطاء" },
      { key: "offsides", label: "التسلل" },
      { key: "yellow_cards", label: "بطاقات صفراء" },
      { key: "red_cards", label: "بطاقات حمراء" },
    ],
  },
];

/** إحصائيات المباراة — تتحدث تلقائياً أثناء البث */
export function MatchStats({ match }: { match: MatchDetails }) {
  const { stats } = match;
  if (!stats || Object.keys(stats).length === 0) {
    return <EmptyPanel text="ستتوفر الإحصائيات بعد انطلاق المباراة." />;
  }

  return (
    <div className="space-y-6 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold">
          <TeamCrest team={match.home_team} size={22} />
          {match.home_team.short_name}
        </div>
        {isLive(match.status) && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-live">
            <span className="size-1.5 animate-pulse rounded-full bg-live" />
            إحصائيات حية
          </span>
        )}
        <div className="flex items-center gap-2 text-sm font-bold">
          {match.away_team.short_name}
          <TeamCrest team={match.away_team} size={22} />
        </div>
      </div>

      {stats.possession && <PossessionBar value={stats.possession} />}

      {GROUPS.map((group) => {
        const rows = group.rows.filter((r) => stats[r.key]);
        if (!rows.length) return null;
        return (
          <section key={group.title}>
            <h3 className="mb-3 text-center text-xs font-bold tracking-wide text-muted">{group.title}</h3>
            <div className="space-y-4">
              {rows.map((row) => (
                <StatRow key={row.key} label={row.label} value={stats[row.key]!} suffix={row.suffix} decimals={row.decimals} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PossessionBar({ value: [home, away] }: { value: [number, number] }) {
  return (
    <div>
      <p className="mb-2 text-center text-xs font-bold text-muted">الاستحواذ</p>
      <div className="flex h-8 overflow-hidden rounded-full text-sm font-bold">
        <div className="flex items-center ps-3 text-brand-fg transition-all duration-700" style={{ width: `${home}%`, background: "var(--color-home)" }}>
          {home}%
        </div>
        <div className="flex items-center justify-end pe-3 text-black transition-all duration-700" style={{ width: `${away}%`, background: "var(--color-away)" }}>
          {away}%
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value: [home, away],
  suffix = "",
  decimals,
}: {
  label: string;
  value: [number, number];
  suffix?: string;
  decimals?: boolean;
}) {
  const total = home + away || 1;
  const fmt = (n: number) => (decimals ? n.toFixed(2) : n) + suffix;
  // للنسب المئوية: نقارن القيم مباشرة من 100 وليس من المجموع
  const homeShare = suffix === "%" ? home : (home / total) * 100;
  const awayShare = suffix === "%" ? away : (away / total) * 100;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm tabular-nums">
        <Value text={fmt(home)} leading={home > away} color="var(--color-home)" />
        <span className="text-xs text-muted">{label}</span>
        <Value text={fmt(away)} leading={away > home} color="var(--color-away)" />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {/* في RTL: العمود الأول يمين (المضيف) — الشريطان يمتدان من المنتصف للخارج */}
        <div className="flex h-1.5 justify-end overflow-hidden rounded-full bg-surface-2">
          <span className="h-full rounded-full transition-all duration-700" style={{ width: `${homeShare}%`, background: home >= away ? "var(--color-home)" : "var(--color-muted)" }} />
        </div>
        <div className="flex h-1.5 justify-start overflow-hidden rounded-full bg-surface-2">
          <span className="h-full rounded-full transition-all duration-700" style={{ width: `${awayShare}%`, background: away >= home ? "var(--color-away)" : "var(--color-muted)" }} />
        </div>
      </div>
    </div>
  );
}

function Value({ text, leading, color }: { text: string; leading: boolean; color: string }) {
  return (
    <span
      className={`min-w-10 rounded-md px-1.5 py-0.5 text-center font-bold ${leading ? "text-black" : ""}`}
      style={leading ? { background: color } : undefined}
    >
      {text}
    </span>
  );
}
