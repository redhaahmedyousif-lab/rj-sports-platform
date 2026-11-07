import { describe, expect, it } from "vitest";
import { isoToZonedInput, zonedInputToIso } from "../zoned-time";

describe("zoned time", () => {
  it("البحرين UTC+3", () => {
    expect(zonedInputToIso("2026-11-07T21:30", "Asia/Bahrain")).toBe("2026-11-07T18:30:00.000Z");
    expect(isoToZonedInput("2026-11-07T18:30:00.000Z", "Asia/Bahrain")).toBe("2026-11-07T21:30");
  });
  it("عبور منتصف الليل", () => {
    expect(zonedInputToIso("2026-11-08T01:00", "Asia/Bahrain")).toBe("2026-11-07T22:00:00.000Z");
  });
  it("منطقة بتوقيت صيفي (لندن) صيفاً وشتاءً", () => {
    expect(zonedInputToIso("2026-07-01T20:00", "Europe/London")).toBe("2026-07-01T19:00:00.000Z");
    expect(zonedInputToIso("2026-12-01T20:00", "Europe/London")).toBe("2026-12-01T20:00:00.000Z");
  });
  it("ذهاب وإياب بدون فقد", () => {
    const iso = "2026-03-15T12:45:00.000Z";
    expect(zonedInputToIso(isoToZonedInput(iso, "Asia/Riyadh"), "Asia/Riyadh")).toBe(iso);
  });
  it("يرفض المدخلات غير الصحيحة", () => {
    expect(zonedInputToIso("2026-11-07 21:30")).toBeNull();
    expect(zonedInputToIso("garbage")).toBeNull();
  });
});
