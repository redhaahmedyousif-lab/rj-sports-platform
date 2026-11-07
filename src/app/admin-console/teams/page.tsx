import { CatalogForms } from "@/components/admin/CatalogForms";
import { TeamCrest } from "@/components/matches/TeamCrest";
import { requireAdmin } from "@/lib/admin/auth";
import { getCatalog } from "@/lib/admin/data";

export const metadata = { title: "الفرق والبطولات" };

export default async function TeamsPage() {
  await requireAdmin();
  const { leagues, teams } = await getCatalog();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">الفرق والبطولات</h1>
      <CatalogForms />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface">
          <h2 className="border-b border-border px-4 py-3 font-bold">البطولات ({leagues.length})</h2>
          <ul className="divide-y divide-border text-sm">
            {leagues.map((l) => (
              <li key={l.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="font-semibold">{l.name}</span>
                <span className="text-xs text-muted">
                  {l.country} · أولوية {l.priority}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-border bg-surface">
          <h2 className="border-b border-border px-4 py-3 font-bold">الفرق ({teams.length})</h2>
          <ul className="divide-y divide-border text-sm">
            {teams.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                <TeamCrest team={t} size={24} />
                <span className="flex-1 font-semibold">{t.name}</span>
                <span className="text-xs text-muted">{t.short_name}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
