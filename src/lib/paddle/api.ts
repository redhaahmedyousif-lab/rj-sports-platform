import "server-only";
import { paddleEnv } from "./config";

const API_BASE = paddleEnv === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";

/**
 * بوابة العميل في Paddle: يدير منها المشترك اشتراكه (إلغاء، تغيير البطاقة، الفواتير).
 * https://developer.paddle.com/api-reference/customer-portals/create-customer-portal-session
 */
export async function createCustomerPortalUrl(customerId: string, subscriptionIds: string[] = []): Promise<string> {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) throw new Error("PADDLE_API_KEY غير مضبوط");

  const res = await fetch(`${API_BASE}/customers/${encodeURIComponent(customerId)}/portal-sessions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ subscription_ids: subscriptionIds }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Paddle portal session failed: ${res.status}`);

  const json = (await res.json()) as { data: { urls: { general: { overview: string } } } };
  return json.data.urls.general.overview;
}
