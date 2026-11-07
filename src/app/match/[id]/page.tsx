import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata = { title: "تفاصيل المباراة" };

// الخطوة 2: مشغل البث + تفاصيل المباراة + الإحصائيات
export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ComingSoon title="تفاصيل المباراة" step={2}>
      صفحة المباراة <code dir="ltr" className="text-fg">{id}</code> — مشغل البث المباشر والإحصائيات قادمة في الخطوة التالية.
    </ComingSoon>
  );
}
