import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata = { title: "لوحة التحكم" };

// الخطوة 4: لوحة التحكم لإدارة المباريات (محمية بـ role = 'admin')
export default function AdminPage() {
  return <ComingSoon title="لوحة التحكم" step={4}>إضافة وتعديل المباريات والنتائج — قادمة في الخطوة الرابعة.</ComingSoon>;
}
