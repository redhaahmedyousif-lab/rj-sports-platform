"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "", label: "نظرة عامة", icon: "📊" },
  { href: "/matches", label: "المباريات", icon: "⚽" },
  { href: "/matches/new", label: "مباراة جديدة", icon: "＋" },
  { href: "/teams", label: "الفرق والبطولات", icon: "🛡️" },
  { href: "/reviews", label: "التقييمات", icon: "⭐" },
];

/** القسم الحالي بغض النظر عن البادئة (المسار السري أو الداخلي بعد rewrite) */
function sectionOf(pathname: string) {
  return pathname.replace(/^\/[^/]+/, "");
}

export function AdminNav({ basePath }: { basePath: string }) {
  const section = sectionOf(usePathname());
  const isActive = (href: string) =>
    href === ""
      ? section === ""
      : href === "/matches"
        ? section === "/matches" || /^\/matches\/[0-9a-f-]{36}/.test(section)
        : section === href;

  return (
    <nav aria-label="لوحة التحكم" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={basePath + item.href}
          aria-current={isActive(item.href) ? "page" : undefined}
          className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
            isActive(item.href) ? "bg-brand/15 text-brand" : "text-muted hover:bg-surface-2 hover:text-fg"
          }`}
        >
          <span aria-hidden>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
