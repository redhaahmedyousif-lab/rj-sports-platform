import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mockSeedReviews } from "./mock";
import type { ReactionEmoji, ReviewBadge, ReviewSummary } from "./types";
import { summarize } from "./validation";

/** صف التقييم داخل الخادم (يحتوي معرّفات المرسل — لا يُرسل للمتصفح) */
export interface ReviewRecord {
  id: string;
  name: string;
  rating: number;
  body: string;
  badge: ReviewBadge;
  created_at: string;
  reviewer_id: string;
  ip_hash: string | null;
  user_id: string | null;
}

export interface ReactionCounts {
  counts: Partial<Record<ReactionEmoji, number>>;
  mine: ReactionEmoji[];
}

export interface ReviewStore {
  list(offset: number, limit: number): Promise<{ rows: ReviewRecord[]; hasMore: boolean }>;
  summary(): Promise<ReviewSummary>;
  reactions(reviewIds: string[], reactorId: string | null): Promise<Map<string, ReactionCounts>>;
  /** عدد التقييمات من نفس المتصفح أو نفس الشبكة منذ لحظة معينة (لتحديد المعدل) */
  recentCount(reviewerId: string, ipHash: string | null, since: Date): Promise<number>;
  create(input: Omit<ReviewRecord, "id" | "created_at">): Promise<ReviewRecord>;
  /** يعيد true إذا أُضيف التفاعل و false إذا أُزيل؛ null إذا التقييم غير موجود */
  toggleReaction(reviewId: string, emoji: ReactionEmoji, reactorId: string): Promise<boolean | null>;
  /** للوحة التحكم */
  listAll(limit: number): Promise<(ReviewRecord & { is_hidden: boolean })[]>;
  setHidden(id: string, hidden: boolean): Promise<void>;
  remove(id: string): Promise<void>;
}

// ---------------- البيانات التجريبية (في ذاكرة الخادم) ----------------

interface MockState {
  reviews: (ReviewRecord & { is_hidden: boolean })[];
  /** reviewId → emoji → مجموعة المتفاعلين */
  reactions: Map<string, Map<ReactionEmoji, Set<string>>>;
}

/** على globalThis حتى تبقى الحالة واحدة بين الصفحات والـ Server Actions داخل نفس العملية */
const globalMock = globalThis as unknown as { __gmReviews?: MockState };

function mockState(): MockState {
  if (!globalMock.__gmReviews) {
    const { reviews, reactions } = mockSeedReviews();
    globalMock.__gmReviews = { reviews: reviews.map((r) => ({ ...r, is_hidden: false })), reactions };
  }
  return globalMock.__gmReviews;
}

class MockReviewStore implements ReviewStore {
  private visible() {
    return mockState()
      .reviews.filter((r) => !r.is_hidden)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  async list(offset: number, limit: number) {
    const all = this.visible();
    return { rows: all.slice(offset, offset + limit), hasMore: offset + limit < all.length };
  }
  async summary() {
    return summarize(this.visible().map((r) => r.rating));
  }
  async reactions(ids: string[], reactorId: string | null) {
    const out = new Map<string, ReactionCounts>();
    for (const id of ids) {
      const byEmoji = mockState().reactions.get(id);
      const counts: ReactionCounts = { counts: {}, mine: [] };
      byEmoji?.forEach((set, emoji) => {
        if (set.size) counts.counts[emoji] = set.size;
        if (reactorId && set.has(reactorId)) counts.mine.push(emoji);
      });
      out.set(id, counts);
    }
    return out;
  }
  async recentCount(reviewerId: string, ipHash: string | null, since: Date) {
    const t = since.toISOString();
    return mockState().reviews.filter((r) => r.created_at >= t && (r.reviewer_id === reviewerId || (ipHash && r.ip_hash === ipHash))).length;
  }
  async create(input: Omit<ReviewRecord, "id" | "created_at">) {
    const record = { ...input, id: crypto.randomUUID(), created_at: new Date().toISOString(), is_hidden: false };
    mockState().reviews.push(record);
    return record;
  }
  async toggleReaction(reviewId: string, emoji: ReactionEmoji, reactorId: string) {
    const state = mockState();
    if (!state.reviews.some((r) => r.id === reviewId && !r.is_hidden)) return null;
    const byEmoji = state.reactions.get(reviewId) ?? new Map<ReactionEmoji, Set<string>>();
    state.reactions.set(reviewId, byEmoji);
    const set = byEmoji.get(emoji) ?? new Set<string>();
    byEmoji.set(emoji, set);
    if (set.has(reactorId)) {
      set.delete(reactorId);
      return false;
    }
    set.add(reactorId);
    return true;
  }
  async listAll(limit: number) {
    return [...mockState().reviews].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
  }
  async setHidden(id: string, hidden: boolean) {
    const r = mockState().reviews.find((x) => x.id === id);
    if (r) r.is_hidden = hidden;
  }
  async remove(id: string) {
    const state = mockState();
    state.reviews = state.reviews.filter((r) => r.id !== id);
    state.reactions.delete(id);
  }
}

// ---------------- Supabase ----------------

const COLUMNS = "id, name, rating, body, badge, created_at, reviewer_id, ip_hash, user_id";

class SupabaseReviewStore implements ReviewStore {
  constructor(private db: SupabaseClient) {}

  private check<T>(res: { data: T; error: { message: string } | null }): T {
    if (res.error) throw new Error(res.error.message);
    return res.data;
  }

  async list(offset: number, limit: number) {
    // نطلب صفاً إضافياً لنعرف إن كان هناك المزيد
    const rows = this.check(
      await this.db
        .from("reviews")
        .select(COLUMNS)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + limit),
    ) as ReviewRecord[];
    return { rows: rows.slice(0, limit), hasMore: rows.length > limit };
  }

  async summary(): Promise<ReviewSummary> {
    const [row] = this.check(await this.db.rpc("review_summary")) as {
      total: number; average: number; r5: number; r4: number; r3: number; r2: number; r1: number;
    }[];
    if (!row) return summarize([]);
    return {
      total: Number(row.total),
      average: Number(row.average),
      distribution: [row.r5, row.r4, row.r3, row.r2, row.r1].map(Number) as ReviewSummary["distribution"],
    };
  }

  async reactions(ids: string[], reactorId: string | null) {
    const out = new Map<string, ReactionCounts>(ids.map((id) => [id, { counts: {}, mine: [] }]));
    if (!ids.length) return out;
    const rows = this.check(
      await this.db.rpc("review_reaction_counts", { p_review_ids: ids, p_reactor: reactorId ?? "" }),
    ) as { review_id: string; emoji: ReactionEmoji; total: number; mine: boolean }[];
    for (const r of rows) {
      const entry = out.get(r.review_id);
      if (!entry) continue;
      entry.counts[r.emoji] = Number(r.total);
      if (r.mine) entry.mine.push(r.emoji);
    }
    return out;
  }

  async recentCount(reviewerId: string, ipHash: string | null, since: Date) {
    const filter = ipHash ? `reviewer_id.eq.${reviewerId},ip_hash.eq.${ipHash}` : `reviewer_id.eq.${reviewerId}`;
    const res = await this.db
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since.toISOString())
      .or(filter);
    if (res.error) throw new Error(res.error.message);
    return res.count ?? 0;
  }

  async create(input: Omit<ReviewRecord, "id" | "created_at">) {
    return this.check(await this.db.from("reviews").insert(input).select(COLUMNS).single()) as ReviewRecord;
  }

  async toggleReaction(reviewId: string, emoji: ReactionEmoji, reactorId: string) {
    const res = await this.db.rpc("toggle_review_reaction", { p_review_id: reviewId, p_emoji: emoji, p_reactor: reactorId });
    if (res.error) {
      if (res.error.code === "P0002") return null;
      throw new Error(res.error.message);
    }
    return res.data as boolean;
  }

  async listAll(limit: number) {
    return this.check(
      await this.db.from("reviews").select(`${COLUMNS}, is_hidden`).order("created_at", { ascending: false }).limit(limit),
    ) as (ReviewRecord & { is_hidden: boolean })[];
  }

  async setHidden(id: string, hidden: boolean) {
    this.check(await this.db.from("reviews").update({ is_hidden: hidden }).eq("id", id));
  }

  async remove(id: string) {
    this.check(await this.db.from("reviews").delete().eq("id", id));
  }
}

/** Supabase إن كانت مضبوطة (مع مفتاح الخادم)، وإلا البيانات التجريبية */
export function getReviewStore(): ReviewStore | null {
  if (!isSupabaseConfigured) return new MockReviewStore();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null; // التقييمات معطّلة حتى يُضبط مفتاح الخادم
  return new SupabaseReviewStore(createAdminClient());
}
