/**
 * الوقت المنقضي بالعربية مع صيغ الجمع الصحيحة:
 * منذ لحظات · منذ دقيقة · منذ دقيقتين · منذ 3 دقائق · منذ 11 دقيقة · منذ يوم · منذ يومين ...
 */
type Unit = { seconds: number; one: string; two: string; few: string; many: string };

const UNITS: Unit[] = [
  { seconds: 365 * 86400, one: "سنة", two: "سنتين", few: "سنوات", many: "سنة" },
  { seconds: 30 * 86400, one: "شهر", two: "شهرين", few: "أشهر", many: "شهراً" },
  { seconds: 7 * 86400, one: "أسبوع", two: "أسبوعين", few: "أسابيع", many: "أسبوعاً" },
  { seconds: 86400, one: "يوم", two: "يومين", few: "أيام", many: "يوماً" },
  { seconds: 3600, one: "ساعة", two: "ساعتين", few: "ساعات", many: "ساعة" },
  { seconds: 60, one: "دقيقة", two: "دقيقتين", few: "دقائق", many: "دقيقة" },
];

export function timeAgoAr(date: Date | string, now: Date = new Date()): string {
  const diff = Math.max(0, Math.floor((now.getTime() - new Date(date).getTime()) / 1000));
  if (diff < 60) return "منذ لحظات";
  for (const u of UNITS) {
    const n = Math.floor(diff / u.seconds);
    if (n < 1) continue;
    if (n === 1) return `منذ ${u.one}`;
    if (n === 2) return `منذ ${u.two}`;
    if (n <= 10) return `منذ ${n} ${u.few}`;
    return `منذ ${n} ${u.many}`;
  }
  return "منذ لحظات";
}
