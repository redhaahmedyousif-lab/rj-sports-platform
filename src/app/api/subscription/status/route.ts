import { NextResponse } from "next/server";
import { getCurrentUser, isPremiumUser } from "@/lib/data/user";

export const dynamic = "force-dynamic";

/** حالة اشتراك المستخدم الحالي — تستخدمها صفحة نجاح الدفع لانتظار تفعيل الـ webhook */
export async function GET() {
  const [user, isPremium] = await Promise.all([getCurrentUser(), isPremiumUser()]);
  return NextResponse.json({ loggedIn: Boolean(user), isPremium }, { headers: { "Cache-Control": "no-store" } });
}
