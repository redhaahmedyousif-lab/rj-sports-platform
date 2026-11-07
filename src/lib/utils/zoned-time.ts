import { APP_TIMEZONE } from "./date";

/** فرق التوقيت (ms) بين المنطقة الزمنية و UTC في لحظة معينة */
function offsetMs(date: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** قيمة حقل datetime-local ("2026-11-07T21:30") بتوقيت التطبيق → ISO بتوقيت UTC */
export function zonedInputToIso(value: string, timeZone = APP_TIMEZONE): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const naive = Date.parse(`${value}:00Z`);
  if (Number.isNaN(naive)) return null;
  let ts = naive - offsetMs(new Date(naive), timeZone);
  // تصحيح ثانٍ لحالات تغيّر التوقيت الصيفي
  const second = naive - offsetMs(new Date(ts), timeZone);
  if (second !== ts) ts = second;
  return new Date(ts).toISOString();
}

/** ISO → قيمة حقل datetime-local بتوقيت التطبيق */
export function isoToZonedInput(iso: string, timeZone = APP_TIMEZONE): string {
  const date = new Date(iso);
  return new Date(date.getTime() + offsetMs(date, timeZone)).toISOString().slice(0, 16);
}
