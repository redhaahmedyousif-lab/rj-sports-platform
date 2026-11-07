import { describe, expect, it } from "vitest";
import { signPaddlePayload, verifyPaddleSignature } from "../webhook";

const SECRET = "pdl_ntfset_test_secret";
const BODY = JSON.stringify({ event_id: "evt_1", event_type: "subscription.created" });
const NOW = 1_800_000_000;

describe("verifyPaddleSignature", () => {
  it("يقبل توقيعاً صحيحاً", () => {
    expect(verifyPaddleSignature(BODY, signPaddlePayload(BODY, SECRET, NOW), SECRET, NOW)).toEqual({ ok: true });
  });

  it("يقبل التوقيع الصحيح ضمن عدة توقيعات (تدوير المفتاح)", () => {
    const valid = signPaddlePayload(BODY, SECRET, NOW);
    const header = `ts=${NOW};h1=${"0".repeat(64)};${valid.split(";")[1]}`;
    expect(verifyPaddleSignature(BODY, header, SECRET, NOW).ok).toBe(true);
  });

  it("يرفض جسماً معدّلاً", () => {
    const header = signPaddlePayload(BODY, SECRET, NOW);
    expect(verifyPaddleSignature(BODY.replace("evt_1", "evt_2"), header, SECRET, NOW)).toEqual({ ok: false, reason: "mismatch" });
  });

  it("يرفض مفتاحاً خاطئاً", () => {
    const header = signPaddlePayload(BODY, "other", NOW);
    expect(verifyPaddleSignature(BODY, header, SECRET, NOW)).toEqual({ ok: false, reason: "mismatch" });
  });

  it("يرفض توقيعاً قديماً (إعادة إرسال)", () => {
    const header = signPaddlePayload(BODY, SECRET, NOW - 301);
    expect(verifyPaddleSignature(BODY, header, SECRET, NOW)).toEqual({ ok: false, reason: "expired" });
  });

  it("يرفض الترويسة الناقصة أو المشوهة", () => {
    expect(verifyPaddleSignature(BODY, null, SECRET, NOW).ok).toBe(false);
    expect(verifyPaddleSignature(BODY, "garbage", SECRET, NOW)).toEqual({ ok: false, reason: "malformed" });
    expect(verifyPaddleSignature(BODY, `ts=${NOW};h1=zz`, SECRET, NOW)).toEqual({ ok: false, reason: "mismatch" });
    expect(verifyPaddleSignature(BODY, `ts=${NOW};h1=abcd`, SECRET, NOW)).toEqual({ ok: false, reason: "mismatch" });
  });
});
