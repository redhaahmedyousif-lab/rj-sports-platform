export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || "Asia/Bahrain";

const keyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** يحوّل تاريخاً إلى مفتاح يوم "YYYY-MM-DD" حسب المنطقة الزمنية للتطبيق */
export function toDateKey(date: Date | string): string {
  return keyFormatter.format(typeof date === "string" ? new Date(date) : date);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function isValidDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
}

/** إضافة أيام إلى مفتاح يوم (الحساب على منتصف اليوم UTC لتجنب مشاكل التوقيت الصيفي) */
export function addDays(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const timeFormatter = new Intl.DateTimeFormat("ar-u-nu-latn", {
  timeZone: APP_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatKickoffTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

const weekdayFormatter = new Intl.DateTimeFormat("ar", { weekday: "short", timeZone: "UTC" });
const dayMonthFormatter = new Intl.DateTimeFormat("ar-u-nu-latn", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** تسمية اليوم في شريط التواريخ: اليوم / أمس / غداً أو اسم اليوم */
export function formatDayLabel(key: string): { title: string; subtitle: string } {
  const today = todayKey();
  const date = new Date(`${key}T12:00:00Z`);
  const subtitle = dayMonthFormatter.format(date);

  if (key === today) return { title: "اليوم", subtitle };
  if (key === addDays(today, -1)) return { title: "أمس", subtitle };
  if (key === addDays(today, 1)) return { title: "غداً", subtitle };
  return { title: weekdayFormatter.format(date), subtitle };
}
