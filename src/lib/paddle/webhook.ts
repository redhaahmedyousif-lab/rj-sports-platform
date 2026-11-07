import { createHmac, timingSafeEqual } from "node:crypto";

/** أقصى فرق مسموح بين توقيت التوقيع والآن (منع إعادة إرسال طلبات قديمة) */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export type SignatureResult = { ok: true } | { ok: false; reason: "missing" | "malformed" | "expired" | "mismatch" };

/**
 * التحقق من توقيع Paddle:
 *   Paddle-Signature: ts=1671552777;h1=<hex>[;h1=<hex> أثناء تدوير المفتاح]
 *   h1 = HMAC-SHA256(secret, `${ts}:${rawBody}`)
 * يجب تمرير جسم الطلب الخام كما هو (قبل JSON.parse).
 */
export function verifyPaddleSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): SignatureResult {
  if (!header) return { ok: false, reason: "missing" };

  let ts: string | undefined;
  const signatures: string[] = [];
  for (const part of header.split(";")) {
    const [key, value] = part.split("=", 2).map((s) => s?.trim());
    if (key === "ts") ts = value;
    else if (key === "h1" && value) signatures.push(value);
  }
  if (!ts || !/^\d+$/.test(ts) || signatures.length === 0) return { ok: false, reason: "malformed" };
  if (Math.abs(nowSeconds - Number(ts)) > SIGNATURE_TOLERANCE_SECONDS) return { ok: false, reason: "expired" };

  const expected = createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest();
  const match = signatures.some((sig) => {
    if (!/^[0-9a-f]+$/i.test(sig)) return false;
    const received = Buffer.from(sig, "hex");
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
  return match ? { ok: true } : { ok: false, reason: "mismatch" };
}

/** توليد توقيع (للاختبارات وأدوات التطوير المحلي) */
export function signPaddlePayload(rawBody: string, secret: string, ts = Math.floor(Date.now() / 1000)) {
  const h1 = createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");
  return `ts=${ts};h1=${h1}`;
}
