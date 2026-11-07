import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoredSubscription, SubscriptionStore } from "./sync";

/** تنفيذ SubscriptionStore فوق Supabase (بعميل service_role) */
export class SupabaseSubscriptionStore implements SubscriptionStore {
  constructor(private db: SupabaseClient) {}

  private check<T>({ data, error }: { data: T; error: { message: string } | null }): T {
    if (error) throw new Error(error.message);
    return data;
  }

  async hasProcessedEvent(eventId: string) {
    const data = this.check(await this.db.from("paddle_events").select("event_id").eq("event_id", eventId).maybeSingle());
    return Boolean(data);
  }

  async markEventProcessed(e: { event_id: string; event_type: string; occurred_at: string }) {
    this.check(
      await this.db
        .from("paddle_events")
        .upsert({ event_id: e.event_id, event_type: e.event_type, occurred_at: e.occurred_at }, { onConflict: "event_id", ignoreDuplicates: true }),
    );
  }

  async getSubscription(id: string) {
    return this.check(await this.db.from("subscriptions").select("*").eq("id", id).maybeSingle()) as StoredSubscription | null;
  }

  async findUserIdByCustomer(customerId: string) {
    const data = this.check(await this.db.from("profiles").select("id").eq("paddle_customer_id", customerId).maybeSingle());
    return (data as { id: string } | null)?.id ?? null;
  }

  async userExists(userId: string) {
    const data = this.check(await this.db.from("profiles").select("id").eq("id", userId).maybeSingle());
    return Boolean(data);
  }

  async upsertSubscription(sub: StoredSubscription) {
    this.check(await this.db.from("subscriptions").upsert(sub, { onConflict: "id" }));
  }

  async listUserSubscriptions(userId: string) {
    return this.check(await this.db.from("subscriptions").select("*").eq("user_id", userId)) as StoredSubscription[];
  }

  async updateProfile(userId: string, data: { is_premium: boolean; premium_until: string | null; paddle_customer_id: string }) {
    this.check(await this.db.from("profiles").update(data).eq("id", userId));
  }
}
