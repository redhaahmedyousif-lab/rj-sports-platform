import { describe, expect, it } from "vitest";
import { charCount, parseReviewForm, summarize } from "../validation";

const fd = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });

describe("parseReviewForm", () => {
  it("يقبل تقييماً صحيحاً وينظّف المسافات", () => {
    expect(parseReviewForm(fd({ name: "  أحمد   علي ", rating: "5", body: "تطبيق   رائع\r\n\n\n\nجداً" }))).toEqual({
      ok: true,
      data: { name: "أحمد علي", rating: 5, body: "تطبيق رائع\n\nجداً" },
    });
  });
  it("يرفض الحقول الناقصة والتقييم خارج 1-5", () => {
    const r = parseReviewForm(fd({ name: "a", rating: "7", body: "abc" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["body", "name", "rating"]);
  });
  it("يحسب الإيموجي حرفاً واحداً ويرفض أكثر من 500", () => {
    expect(charCount("🔥🔥")).toBe(2);
    expect(parseReviewForm(fd({ name: "سارة", rating: "4", body: "🔥".repeat(500) })).ok).toBe(true);
    expect(parseReviewForm(fd({ name: "سارة", rating: "4", body: "a".repeat(501) })).ok).toBe(false);
  });
  it("يحذف محارف الاتجاه المخفية (RLO) التي تقلب عرض النص", () => {
    const r = parseReviewForm(fd({ name: "Ali‮txt", rating: "3", body: "​جيد جداً" }));
    expect(r).toEqual({ ok: true, data: { name: "Alitxt", rating: 3, body: "جيد جداً" } });
  });
  it("الحقل المخفي (honeypot) = سبام", () => {
    expect(parseReviewForm(fd({ name: "bot", rating: "5", body: "buy now", website: "http://spam" }))).toMatchObject({ ok: false, spam: true });
  });
});

describe("summarize", () => {
  it("المتوسط لأقرب منزلة والتوزيع", () => {
    expect(summarize([5, 5, 4, 3])).toEqual({ average: 4.3, total: 4, distribution: [2, 1, 1, 0, 0] });
    expect(summarize([])).toEqual({ average: 0, total: 0, distribution: [0, 0, 0, 0, 0] });
  });
});
