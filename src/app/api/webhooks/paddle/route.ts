import { NextResponse } from "next/server";
import { paddlePriceId } from "@/lib/paddle/config";
import { SupabaseSubscriptionStore } from "@/lib/paddle/store";
import { handlePaddleEvent, type PaddleEvent } from "@/lib/paddle/sync";
import { verifyPaddleSignature } from "@/lib/paddle/webhook";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Paddle → Notifications → Webhook destination:
 *   URL: https://<domain>/api/webhooks/paddle
 *   الأحداث: subscription.* (created, activated, updated, trialing, past_due, paused, resumed, canceled)
 *
 * الردود: 2xx = تمت/تم تجاهلها (لا تعيد Paddle الإرسال) — 5xx = خطأ مؤقت (تعيد Paddle المحاولة).
 */
export async function POST(request: Request) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[paddle webhook] PADDLE_WEBHOOK_SECRET غير مضبوط");
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const verification = verifyPaddleSignature(rawBody, request.headers.get("paddle-signature"), secret);
  if (!verification.ok) {
    return NextResponse.json({ error: `invalid signature: ${verification.reason}` }, { status: 401 });
  }

  let event: PaddleEvent;
  try {
    event = JSON.parse(rawBody) as PaddleEvent;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  try {
    const store = new SupabaseSubscriptionStore(createAdminClient());
    const result = await handlePaddleEvent(event, store, {
      premiumPriceIds: paddlePriceId ? [paddlePriceId] : undefined,
    });
    if (result.status === "unmatched") console.warn("[paddle webhook] unmatched", event.event_id, result.reason);
    return NextResponse.json({ received: true, result: result.status });
  } catch (error) {
    console.error("[paddle webhook] failed", event.event_id, error);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
