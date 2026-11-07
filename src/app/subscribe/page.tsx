import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata = { title: "الاشتراك المميز" };

// الخطوة 3: صفحة الاشتراك الشهري 1.99$ (Stripe / Paddle + تحديث profiles.is_premium)
export default function SubscribePage() {
  return (
    <ComingSoon title="RJ Premium — 1.99$ شهرياً" step={3}>
      إزالة الإعلانات وفتح ميزات إضافية. صفحة الدفع قادمة في الخطوة الثالثة.
    </ComingSoon>
  );
}
