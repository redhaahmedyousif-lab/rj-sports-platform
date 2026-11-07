import { describe, expect, it } from "vitest";
import { timeAgoAr } from "../time-ago";

const now = new Date("2026-11-07T12:00:00Z");
const ago = (s: number) => new Date(now.getTime() - s * 1000);

describe("timeAgoAr", () => {
  it("صيغ المفرد والمثنى والجمع", () => {
    expect(timeAgoAr(ago(10), now)).toBe("منذ لحظات");
    expect(timeAgoAr(ago(60), now)).toBe("منذ دقيقة");
    expect(timeAgoAr(ago(120), now)).toBe("منذ دقيقتين");
    expect(timeAgoAr(ago(5 * 60), now)).toBe("منذ 5 دقائق");
    expect(timeAgoAr(ago(15 * 60), now)).toBe("منذ 15 دقيقة");
    expect(timeAgoAr(ago(86400), now)).toBe("منذ يوم");
    expect(timeAgoAr(ago(2 * 86400), now)).toBe("منذ يومين");
    expect(timeAgoAr(ago(3 * 86400), now)).toBe("منذ 3 أيام");
    expect(timeAgoAr(ago(14 * 86400), now)).toBe("منذ أسبوعين");
    expect(timeAgoAr(ago(400 * 86400), now)).toBe("منذ سنة");
  });
  it("تاريخ مستقبلي (فرق ساعة الخادم) لا يعطي قيمة سالبة", () => {
    expect(timeAgoAr(new Date(now.getTime() + 5000), now)).toBe("منذ لحظات");
  });
});
