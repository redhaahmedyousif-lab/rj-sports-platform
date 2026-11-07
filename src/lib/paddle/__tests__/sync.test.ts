import { beforeEach, describe, expect, it } from "vitest";
import {
  combineEntitlements,
  entitlementFor,
  handlePaddleEvent,
  RENEWAL_GRACE_MS,
  type Entitlement,
  type PaddleEvent,
  type PaddleSubscription,
  type StoredSubscription,
  type SubscriptionStore,
} from "../sync";

const USER = "11111111-1111-4111-8111-111111111111";
const PRICE = "pri_premium";
const NOW = new Date("2026-11-07T12:00:00Z");
const PERIOD_END = "2026-12-07T12:00:00Z";

class MemoryStore implements SubscriptionStore {
  events = new Set<string>();
  subs = new Map<string, StoredSubscription>();
  profiles = new Map<string, Partial<Entitlement & { paddle_customer_id: string }>>([[USER, {}]]);

  async hasProcessedEvent(id: string) { return this.events.has(id); }
  async markEventProcessed(e: Pick<PaddleEvent, "event_id">) { this.events.add(e.event_id); }
  async getSubscription(id: string) { return this.subs.get(id) ?? null; }
  async findUserIdByCustomer(customerId: string) {
    for (const [id, p] of this.profiles) if (p.paddle_customer_id === customerId) return id;
    return null;
  }
  async userExists(id: string) { return this.profiles.has(id); }
  async upsertSubscription(s: StoredSubscription) { this.subs.set(s.id, s); }
  async listUserSubscriptions(userId: string) { return [...this.subs.values()].filter((s) => s.user_id === userId); }
  async updateProfile(userId: string, data: Entitlement & { paddle_customer_id: string }) {
    this.profiles.set(userId, { ...this.profiles.get(userId), ...data });
  }
}

let seq = 0;
function event(type: string, data: Partial<PaddleSubscription>, occurredAt = "2026-11-07T11:00:00Z"): PaddleEvent {
  return {
    event_id: `evt_${++seq}`,
    event_type: type,
    occurred_at: occurredAt,
    data: {
      id: "sub_1",
      status: "active",
      customer_id: "ctm_1",
      items: [{ price: { id: PRICE } }],
      current_billing_period: { starts_at: "2026-11-07T12:00:00Z", ends_at: PERIOD_END },
      scheduled_change: null,
      custom_data: { user_id: USER },
      ...data,
    },
  };
}

const opts = { premiumPriceIds: [PRICE], now: NOW };

describe("handlePaddleEvent", () => {
  let store: MemoryStore;
  beforeEach(() => {
    store = new MemoryStore();
  });

  it("subscription.created → يفعّل Premium حتى نهاية الفترة + مهلة التجديد", async () => {
    const res = await handlePaddleEvent(event("subscription.created", {}), store, opts);
    expect(res.status).toBe("processed");
    const profile = store.profiles.get(USER)!;
    expect(profile.is_premium).toBe(true);
    expect(profile.premium_until).toBe(new Date(Date.parse(PERIOD_END) + RENEWAL_GRACE_MS).toISOString());
    expect(profile.paddle_customer_id).toBe("ctm_1");
  });

  it("نفس الحدث مرتين → يُعالج مرة واحدة", async () => {
    const e = event("subscription.created", {});
    await handlePaddleEvent(e, store, opts);
    expect((await handlePaddleEvent(e, store, opts)).status).toBe("duplicate");
  });

  it("إلغاء مجدول → يبقى Premium حتى نهاية الفترة المدفوعة بالضبط", async () => {
    await handlePaddleEvent(event("subscription.created", {}), store, opts);
    await handlePaddleEvent(
      event("subscription.updated", { scheduled_change: { action: "cancel", effective_at: PERIOD_END } }, "2026-11-07T11:30:00Z"),
      store,
      opts,
    );
    expect(store.profiles.get(USER)).toMatchObject({ is_premium: true, premium_until: new Date(PERIOD_END).toISOString() });
    expect(store.subs.get("sub_1")!.cancel_at_period_end).toBe(true);
  });

  it("subscription.canceled → يلغي Premium", async () => {
    await handlePaddleEvent(event("subscription.created", {}), store, opts);
    await handlePaddleEvent(
      event("subscription.canceled", { status: "canceled", canceled_at: "2026-11-07T11:45:00Z", current_billing_period: null }, "2026-11-07T11:45:00Z"),
      store,
      opts,
    );
    expect(store.profiles.get(USER)).toMatchObject({ is_premium: false, premium_until: null });
  });

  it("حدث قديم يصل متأخراً لا يعيد تفعيل اشتراك ملغى", async () => {
    await handlePaddleEvent(event("subscription.canceled", { status: "canceled" }, "2026-11-07T11:50:00Z"), store, opts);
    const res = await handlePaddleEvent(event("subscription.activated", {}, "2026-11-07T11:00:00Z"), store, opts);
    expect(res.status).toBe("stale");
    expect(store.profiles.get(USER)!.is_premium).toBe(false);
  });

  it("past_due → وصول حتى نهاية الفترة فقط؛ paused → بدون وصول", async () => {
    await handlePaddleEvent(event("subscription.past_due", { status: "past_due" }), store, opts);
    expect(store.profiles.get(USER)).toMatchObject({ is_premium: true, premium_until: new Date(PERIOD_END).toISOString() });
    await handlePaddleEvent(event("subscription.paused", { status: "paused" }, "2026-11-07T11:10:00Z"), store, opts);
    expect(store.profiles.get(USER)!.is_premium).toBe(false);
  });

  it("الربط برقم العميل عند غياب custom_data", async () => {
    store.profiles.set(USER, { paddle_customer_id: "ctm_1" });
    const res = await handlePaddleEvent(event("subscription.created", { custom_data: null }), store, opts);
    expect(res).toMatchObject({ status: "processed", userId: USER });
  });

  it("user_id غير موجود أو غير صالح → unmatched ولا يُكتب شيء", async () => {
    const bad = await handlePaddleEvent(event("subscription.created", { custom_data: { user_id: "x' or 1=1" } }), store, opts);
    expect(bad.status).toBe("unmatched");
    const ghost = await handlePaddleEvent(
      event("subscription.created", { custom_data: { user_id: "22222222-2222-4222-8222-222222222222" } }),
      store,
      opts,
    );
    expect(ghost.status).toBe("unmatched");
    expect(store.subs.size).toBe(0);
  });

  it("سعر لمنتج آخر لا يمنح Premium", async () => {
    const res = await handlePaddleEvent(event("subscription.created", { items: [{ price: { id: "pri_other" } }] }), store, opts);
    expect(res.status).toBe("ignored");
    expect(store.profiles.get(USER)!.is_premium).toBeUndefined();
  });

  it("أحداث أخرى (transaction.*) تُتجاهل", async () => {
    expect((await handlePaddleEvent(event("transaction.completed", {}), store, opts)).status).toBe("ignored");
  });
});

describe("entitlement", () => {
  const base: StoredSubscription = {
    id: "sub_x",
    user_id: USER,
    customer_id: "ctm_1",
    status: "active",
    price_id: PRICE,
    current_period_start: null,
    current_period_end: PERIOD_END,
    cancel_at_period_end: false,
    canceled_at: null,
    last_event_at: NOW.toISOString(),
  };

  it("اشتراك نشط انتهت فترته منذ أكثر من مهلة التجديد → غير Premium", () => {
    const later = new Date(Date.parse(PERIOD_END) + RENEWAL_GRACE_MS + 1000);
    expect(entitlementFor(base, later).is_premium).toBe(false);
  });

  it("أكثر من اشتراك → يأخذ الأبعد تاريخاً", () => {
    const longer = { ...base, id: "sub_y", current_period_end: "2027-01-07T12:00:00Z" };
    const canceled = { ...base, id: "sub_z", status: "canceled" as const };
    const e = combineEntitlements([base, canceled, longer], NOW);
    expect(e.is_premium).toBe(true);
    expect(e.premium_until).toBe(new Date(Date.parse("2027-01-07T12:00:00Z") + RENEWAL_GRACE_MS).toISOString());
  });
});
