/**
 * منطق مزامنة اشتراكات Paddle → حالة Premium.
 * منفصل عن قاعدة البيانات (عبر واجهة SubscriptionStore) ليسهل اختباره.
 */

export type PaddleSubscriptionStatus = "active" | "trialing" | "past_due" | "paused" | "canceled";

/** الحقول التي نستخدمها من كائن subscription في Paddle Billing */
export interface PaddleSubscription {
  id: string;
  status: PaddleSubscriptionStatus;
  customer_id: string;
  items?: { price?: { id: string } | null }[];
  current_billing_period?: { starts_at: string; ends_at: string } | null;
  scheduled_change?: { action: "cancel" | "pause" | "resume"; effective_at: string } | null;
  canceled_at?: string | null;
  custom_data?: Record<string, unknown> | null;
}

export interface PaddleEvent {
  event_id: string;
  event_type: string;
  occurred_at: string;
  data: unknown;
}

export interface StoredSubscription {
  id: string;
  user_id: string;
  customer_id: string;
  status: PaddleSubscriptionStatus;
  price_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  last_event_at: string;
}

export interface Entitlement {
  is_premium: boolean;
  premium_until: string | null;
}

export interface SubscriptionStore {
  hasProcessedEvent(eventId: string): Promise<boolean>;
  markEventProcessed(event: Pick<PaddleEvent, "event_id" | "event_type" | "occurred_at">): Promise<void>;
  getSubscription(id: string): Promise<StoredSubscription | null>;
  findUserIdByCustomer(customerId: string): Promise<string | null>;
  userExists(userId: string): Promise<boolean>;
  upsertSubscription(sub: StoredSubscription): Promise<void>;
  listUserSubscriptions(userId: string): Promise<StoredSubscription[]>;
  updateProfile(userId: string, data: Entitlement & { paddle_customer_id: string }): Promise<void>;
}

export type SyncResult =
  | { status: "processed"; userId: string; entitlement: Entitlement }
  | { status: "duplicate" | "ignored" | "stale" | "unmatched"; reason?: string };

const SUBSCRIPTION_EVENTS = new Set([
  "subscription.created",
  "subscription.activated",
  "subscription.updated",
  "subscription.trialing",
  "subscription.past_due",
  "subscription.paused",
  "subscription.resumed",
  "subscription.canceled",
]);

/**
 * مهلة إضافية بعد نهاية الفترة: تجديد الاشتراك قد يصل webhook الخاص به متأخراً قليلاً،
 * فلا نريد أن تظهر الإعلانات للمشترك لدقائق بين انتهاء الفترة ووصول التجديد.
 */
export const RENEWAL_GRACE_MS = 24 * 60 * 60 * 1000;

/** هل يمنح هذا الاشتراك صلاحية Premium؟ وحتى متى؟ */
export function entitlementFor(sub: StoredSubscription, now = new Date()): Entitlement {
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : null;
  const until = periodEnd ? new Date(periodEnd.getTime() + RENEWAL_GRACE_MS) : null;

  switch (sub.status) {
    case "active":
    case "trialing":
      // حتى مع الإلغاء المجدول يبقى Premium حتى نهاية الفترة المدفوعة
      if (sub.cancel_at_period_end && periodEnd) {
        return periodEnd > now ? { is_premium: true, premium_until: periodEnd.toISOString() } : NONE;
      }
      return { is_premium: until ? until > now : true, premium_until: until?.toISOString() ?? null };
    case "past_due":
      // فشل الدفع: Paddle يعيد المحاولة — نُبقي الوصول حتى نهاية الفترة الحالية فقط
      return periodEnd && periodEnd > now ? { is_premium: true, premium_until: periodEnd.toISOString() } : NONE;
    default:
      return NONE;
  }
}

const NONE: Entitlement = { is_premium: false, premium_until: null };

/** دمج كل اشتراكات المستخدم: Premium إن كان أي منها فعالاً، وحتى أبعد تاريخ */
export function combineEntitlements(subs: StoredSubscription[], now = new Date()): Entitlement {
  let result: Entitlement = NONE;
  for (const sub of subs) {
    const e = entitlementFor(sub, now);
    if (!e.is_premium) continue;
    if (!result.is_premium) result = e;
    else if (e.premium_until === null || (result.premium_until !== null && e.premium_until > result.premium_until)) {
      result = e;
    }
  }
  return result;
}

function isPaddleSubscription(data: unknown): data is PaddleSubscription {
  const d = data as PaddleSubscription;
  return Boolean(d && typeof d.id === "string" && typeof d.status === "string" && typeof d.customer_id === "string");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function handlePaddleEvent(
  event: PaddleEvent,
  store: SubscriptionStore,
  options: { premiumPriceIds?: string[]; now?: Date } = {},
): Promise<SyncResult> {
  if (!SUBSCRIPTION_EVENTS.has(event.event_type)) return { status: "ignored", reason: event.event_type };
  if (!isPaddleSubscription(event.data)) return { status: "ignored", reason: "invalid payload" };
  if (await store.hasProcessedEvent(event.event_id)) return { status: "duplicate" };

  const sub = event.data;
  const priceId = sub.items?.[0]?.price?.id ?? null;
  const { premiumPriceIds } = options;
  if (premiumPriceIds?.length && !sub.items?.some((i) => i.price && premiumPriceIds.includes(i.price.id))) {
    await store.markEventProcessed(event);
    return { status: "ignored", reason: "not a premium price" };
  }

  const existing = await store.getSubscription(sub.id);

  // الأحداث قد تصل بغير ترتيبها — نتجاهل أي حدث أقدم من آخر حدث طبقناه
  if (existing && new Date(event.occurred_at) < new Date(existing.last_event_at)) {
    await store.markEventProcessed(event);
    return { status: "stale" };
  }

  // ربط الاشتراك بالمستخدم: custom_data.user_id من صفحة الدفع، ثم الاشتراك المخزّن، ثم رقم العميل
  const customUserId = typeof sub.custom_data?.user_id === "string" ? sub.custom_data.user_id : null;
  let userId = existing?.user_id ?? null;
  if (!userId && customUserId && UUID.test(customUserId) && (await store.userExists(customUserId))) {
    userId = customUserId;
  }
  if (!userId) userId = await store.findUserIdByCustomer(sub.customer_id);
  if (!userId) return { status: "unmatched", reason: `no user for ${sub.id}` };

  const stored: StoredSubscription = {
    id: sub.id,
    user_id: userId,
    customer_id: sub.customer_id,
    status: sub.status,
    price_id: priceId,
    current_period_start: sub.current_billing_period?.starts_at ?? null,
    current_period_end: sub.current_billing_period?.ends_at ?? existing?.current_period_end ?? null,
    cancel_at_period_end: sub.scheduled_change?.action === "cancel",
    canceled_at: sub.canceled_at ?? null,
    last_event_at: event.occurred_at,
  };
  await store.upsertSubscription(stored);

  const all = await store.listUserSubscriptions(userId);
  const entitlement = combineEntitlements(all, options.now);
  await store.updateProfile(userId, { ...entitlement, paddle_customer_id: sub.customer_id });
  await store.markEventProcessed(event);

  return { status: "processed", userId, entitlement };
}
