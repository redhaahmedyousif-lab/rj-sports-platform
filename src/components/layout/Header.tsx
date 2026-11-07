import Link from "next/link";
import { BallIcon, CrownIcon } from "@/components/ui/icons";

// العناصر ذات soon: true تُفعَّل في المراحل القادمة
const NAV = [
  { href: "/", label: "المباريات" },
  { href: "/news", label: "الأخبار", soon: true },
  { href: "/leagues", label: "البطولات", soon: true },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold">
          <span className="grid size-8 place-items-center rounded-lg bg-brand text-brand-fg">
            <BallIcon width={18} height={18} />
          </span>
          RJ <span className="text-brand">Sports</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) =>
            item.soon ? (
              <span key={item.href} title="قريباً" className="cursor-default px-3 py-1.5 text-sm text-muted/50">
                {item.label}
              </span>
            ) : (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm text-muted transition hover:bg-surface hover:text-fg"
            >
              {item.label}
            </Link>
            ),
          )}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <Link
            href="/subscribe"
            className="flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1.5 text-sm font-bold text-gold ring-1 ring-gold/30 transition hover:bg-gold/25"
          >
            <CrownIcon width={16} height={16} />
            Premium
          </Link>
        </div>
      </div>
    </header>
  );
}
