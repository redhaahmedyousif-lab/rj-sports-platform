import { revalidatePath } from "next/cache";
import { Stars } from "@/components/reviews/Stars";
import { requireAdmin } from "@/lib/admin/auth";
import { getReviewStore } from "@/lib/reviews/store";
import { timeAgoAr } from "@/lib/utils/time-ago";

export const metadata = { title: "التقييمات" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** إخفاء/إظهار/حذف تقييم — للمشرف فقط */
async function moderate(fd: FormData) {
  "use server";
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const op = String(fd.get("op") ?? "");
  const store = getReviewStore();
  if (!store || !UUID.test(id)) return;
  if (op === "hide") await store.setHidden(id, true);
  else if (op === "show") await store.setHidden(id, false);
  else if (op === "delete") await store.remove(id);
  revalidatePath("/", "layout");
}

export default async function AdminReviewsPage() {
  await requireAdmin();
  const store = getReviewStore();
  const reviews = store ? await store.listAll(100) : [];
  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-extrabold">التقييمات</h1>
        <p className="text-xs text-muted">آخر 100 تقييم · المخفي لا يظهر للزوار ولا يُحسب في المتوسط</p>
      </div>

      {!store && (
        <p className="rounded-xl border border-gold/30 bg-gold/10 p-4 text-sm text-gold">
          التقييمات معطّلة: أضف SUPABASE_SERVICE_ROLE_KEY في متغيرات البيئة.
        </p>
      )}

      <ul className="space-y-2">
        {reviews.map((r) => (
          <li
            key={r.id}
            data-admin-review={r.id}
            className={`flex flex-col gap-3 rounded-xl border bg-surface p-4 sm:flex-row sm:items-start ${r.is_hidden ? "border-dashed border-border opacity-60" : "border-border"}`}
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-bold">{r.name}</span>
                <Stars value={r.rating} size={13} />
                <span className="text-xs text-muted">{timeAgoAr(r.created_at, now)}</span>
                {r.is_hidden && <span className="rounded bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-muted">مخفي</span>}
              </div>
              <p dir="auto" className="whitespace-pre-line break-words text-sm text-fg/90">
                {r.body}
              </p>
            </div>
            <form action={moderate} className="flex shrink-0 gap-2">
              <input type="hidden" name="id" value={r.id} />
              <button
                name="op"
                value={r.is_hidden ? "show" : "hide"}
                className="rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-bold ring-1 ring-border hover:bg-border"
              >
                {r.is_hidden ? "إظهار" : "إخفاء"}
              </button>
              <button name="op" value="delete" className="rounded-lg px-3 py-1.5 text-xs font-bold text-live ring-1 ring-live/40 hover:bg-live/10">
                حذف
              </button>
            </form>
          </li>
        ))}
        {store && reviews.length === 0 && <li className="py-10 text-center text-sm text-muted">لا توجد تقييمات.</li>}
      </ul>
    </div>
  );
}
