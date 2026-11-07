import Link from "next/link";

export type MatchFilter = "all" | "live";

/** تبويبات: كل المباريات / المباشرة فقط */
export function MatchFilters({
  active,
  date,
  liveCount,
  totalCount,
}: {
  active: MatchFilter;
  date?: string;
  liveCount: number;
  totalCount: number;
}) {
  const href = (filter: MatchFilter) => {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (filter === "live") params.set("filter", "live");
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  const tabs = [
    { key: "all" as const, label: "كل المباريات", count: totalCount },
    { key: "live" as const, label: "مباشر الآن", count: liveCount },
  ];

  return (
    <div role="tablist" className="inline-flex rounded-full bg-surface p-1 ring-1 ring-border">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            href={href(tab.key)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              isActive ? "bg-surface-2 text-fg" : "text-muted hover:text-fg"
            }`}
          >
            {tab.key === "live" && <span className="size-1.5 rounded-full bg-live" />}
            {tab.label}
            <span className="text-xs tabular-nums text-muted">{tab.count}</span>
          </Link>
        );
      })}
    </div>
  );
}
