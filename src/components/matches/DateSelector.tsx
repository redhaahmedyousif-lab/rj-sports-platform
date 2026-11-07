import Link from "next/link";
import { addDays, formatDayLabel, todayKey } from "@/lib/utils/date";
import { ScrollActiveIntoView } from "./ScrollActiveIntoView";

const RANGE = 3; // عدد الأيام قبل وبعد اليوم

/** شريط اختيار اليوم — روابط عادية (Server Component) تحافظ على الفلتر الحالي */
export function DateSelector({ selected, filter }: { selected: string; filter?: string }) {
  const today = todayKey();
  const days = Array.from({ length: RANGE * 2 + 1 }, (_, i) => addDays(today, i - RANGE));

  return (
    <nav id="date-selector" aria-label="اختيار اليوم" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {days.map((key) => {
        const { title, subtitle } = formatDayLabel(key);
        const active = key === selected;
        const params = new URLSearchParams();
        if (key !== today) params.set("date", key);
        if (filter) params.set("filter", filter);
        const qs = params.toString();

        return (
          <Link
            key={key}
            href={qs ? `/?${qs}` : "/"}
            aria-current={active ? "date" : undefined}
            className={`flex min-w-18 shrink-0 flex-col items-center rounded-xl px-3 py-2 transition ${
              active
                ? "bg-brand text-brand-fg"
                : "bg-surface text-muted ring-1 ring-border hover:bg-surface-2 hover:text-fg"
            }`}
          >
            <span className="text-sm font-bold">{title}</span>
            <span className="text-xs opacity-80">{subtitle}</span>
          </Link>
        );
      })}
      <ScrollActiveIntoView containerId="date-selector" deps={selected} />
    </nav>
  );
}
