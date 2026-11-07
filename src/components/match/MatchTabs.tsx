"use client";

import { useId, useState } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

/**
 * تبويبات صفحة المباراة. المحتوى يُرسم على الخادم ويُمرَّر كـ props،
 * فالتبديل فوري بدون طلب جديد، ويُحفظ التبويب في الرابط (?tab=) للمشاركة.
 */
export function MatchTabs({ tabs, initial }: { tabs: TabItem[]; initial?: string }) {
  const [active, setActive] = useState(tabs.some((t) => t.id === initial) ? initial! : tabs[0].id);
  const baseId = useId();

  const select = (id: string) => {
    setActive(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url);
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    // في RTL: السهم الأيسر = التالي
    const delta = e.key === "ArrowLeft" ? 1 : e.key === "ArrowRight" ? -1 : 0;
    if (!delta) return;
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    select(next.id);
    document.getElementById(`${baseId}-tab-${next.id}`)?.focus();
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div role="tablist" className="flex border-b border-border">
        {tabs.map((tab, i) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              id={`${baseId}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`relative flex-1 py-3 text-sm font-bold transition ${
                selected ? "text-fg" : "text-muted hover:text-fg"
              }`}
            >
              {tab.label}
              {selected && <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-brand" />}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${baseId}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={tab.id !== active}
          className="p-3 sm:p-5"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
