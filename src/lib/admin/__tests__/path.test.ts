import { describe, expect, it } from "vitest";
import { isValidAdminSlug, matchAdminRoute } from "../path";

describe("isValidAdminSlug", () => {
  it("يرفض المسارات المشهورة والقصيرة", () => {
    for (const s of ["admin", "dashboard", "manage", "admin-console", "short", "", null, undefined]) {
      expect(isValidAdminSlug(s)).toBe(false);
    }
  });
  it("يرفض الرموز والأحرف الكبيرة والشرطات المائلة", () => {
    expect(isValidAdminSlug("Ops-Panel-2026")).toBe(false);
    expect(isValidAdminSlug("ops/panel-2026x")).toBe(false);
    expect(isValidAdminSlug("-ops-panel-2026")).toBe(false);
  });
  it("يقبل مساراً عشوائياً كافياً", () => {
    expect(isValidAdminSlug("ops-7f3k9q2m4x")).toBe(true);
  });
});

describe("matchAdminRoute", () => {
  const slug = "ops-7f3k9q2m4x";
  it("المسار الداخلي محظور دائماً (حتى بأحرف كبيرة)", () => {
    expect(matchAdminRoute("/admin-console", slug).kind).toBe("internal");
    expect(matchAdminRoute("/admin-console/matches", slug).kind).toBe("internal");
    expect(matchAdminRoute("/Admin-Console/matches", slug).kind).toBe("internal");
    expect(matchAdminRoute("/admin-console", null).kind).toBe("internal");
  });
  it("المسار السري يُحوَّل للمسار الداخلي مع الحفاظ على باقي المسار", () => {
    expect(matchAdminRoute(`/${slug}`, slug)).toEqual({ kind: "admin", internalPath: "/admin-console" });
    expect(matchAdminRoute(`/${slug}/matches/abc`, slug)).toEqual({ kind: "admin", internalPath: "/admin-console/matches/abc" });
  });
  it("لا يطابق بادئة جزئية أو مساراً عادياً", () => {
    expect(matchAdminRoute(`/${slug}x`, slug).kind).toBe("none");
    expect(matchAdminRoute("/admin", slug).kind).toBe("none");
    expect(matchAdminRoute("/", slug).kind).toBe("none");
  });
  it("بدون مسار سري: لوحة التحكم غير موجودة", () => {
    expect(matchAdminRoute(`/${slug}`, null).kind).toBe("none");
  });
});
