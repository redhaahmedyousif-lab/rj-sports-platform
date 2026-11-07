import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { timeAgoAr } from "@/lib/utils/time-ago";
import { getReviewStore, type ReviewRecord, type ReviewStore } from "./store";
import { REVIEWS_PAGE_SIZE, type ReviewDTO, type ReviewPage, type ReviewSummary } from "./types";

/** كوكي مجهول يميّز المتصفح (للتفاعلات وتحديد معدل الإرسال) — لا يحتوي أي بيانات شخصية */
const REACTOR_COOKIE = "gm_rid";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** معرّف الزائر الحالي (قراءة فقط — يُستخدم أثناء عرض الصفحة) */
export async function readReactorId(): Promise<string | null> {
  const value = (await cookies()).get(REACTOR_COOKIE)?.value;
  return value && UUID.test(value) ? value : null;
}

/** معرّف الزائر، مع إنشائه إن لم يوجد (يُستدعى فقط داخل Server Actions) */
export async function ensureReactorId(): Promise<string> {
  const existing = await readReactorId();
  if (existing) return existing;
  const id = randomUUID();
  (await cookies()).set(REACTOR_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return id;
}

/** بصمة عنوان IP (SHA-256 مع ملح) — لتحديد المعدل دون تخزين العنوان نفسه */
export async function hashedIp(): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip");
  if (!ip) return null;
  const salt = process.env.REVIEWS_IP_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "goalmood";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export async function toDTOs(store: ReviewStore, rows: ReviewRecord[], reactorId: string | null): Promise<ReviewDTO[]> {
  const reactions = await store.reactions(rows.map((r) => r.id), reactorId);
  const now = new Date();
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    rating: r.rating,
    body: r.body,
    badge: r.badge,
    createdAt: r.created_at,
    timeAgo: timeAgoAr(r.created_at, now),
    reactions: reactions.get(r.id)?.counts ?? {},
    mine: reactions.get(r.id)?.mine ?? [],
  }));
}

export interface ReviewsSectionData {
  enabled: boolean;
  summary: ReviewSummary;
  page: ReviewPage;
}

const EMPTY: ReviewsSectionData = {
  enabled: false,
  summary: { average: 0, total: 0, distribution: [0, 0, 0, 0, 0] },
  page: { reviews: [], hasMore: false },
};

/** بيانات قسم التقييمات للصفحة الرئيسية */
export async function getReviewsSection(): Promise<ReviewsSectionData> {
  const store = getReviewStore();
  if (!store) return EMPTY;
  try {
    const [summary, { rows, hasMore }, reactorId] = await Promise.all([
      store.summary(),
      store.list(0, REVIEWS_PAGE_SIZE),
      readReactorId(),
    ]);
    return { enabled: true, summary, page: { reviews: await toDTOs(store, rows, reactorId), hasMore } };
  } catch (error) {
    console.error("[reviews] failed to load", error);
    return EMPTY;
  }
}
