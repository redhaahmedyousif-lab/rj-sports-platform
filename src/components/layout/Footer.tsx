import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border py-6 text-sm text-muted">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4">
        <p>© {new Date().getFullYear()} RJ Sports. جميع الحقوق محفوظة.</p>
        <nav className="flex gap-4">
          <Link href="/subscribe" className="hover:text-fg">الاشتراك</Link>
        </nav>
      </div>
    </footer>
  );
}
