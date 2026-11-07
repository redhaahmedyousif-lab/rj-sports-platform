import { REVIEW_BODY_MAX, REVIEW_BODY_MIN, REVIEW_NAME_MAX } from "./types";

export interface ReviewInput {
  name: string;
  rating: number;
  body: string;
}

export type ReviewFieldErrors = Partial<Record<"name" | "rating" | "body", string>>;

/** حذف محارف التحكم والاتجاه غير المرئية (تُستخدم للتلاعب بعرض النص) وتوحيد المسافات */
function clean(value: string, multiline: boolean): string {
  let s = value.normalize("NFC").replace(/[​-‏‪-‮⁦-⁩﻿]/g, "");
  s = s.replace(multiline ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, "");
  if (multiline) return s.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]+/g, " ").trim();
  return s.replace(/\s+/g, " ").trim();
}

/** عدد الأحرف كما يراها المستخدم (الإيموجي = حرف واحد) */
export function charCount(value: string): number {
  return Array.from(value).length;
}

export function parseReviewForm(fd: { get(name: string): FormDataEntryValue | null }):
  | { ok: true; data: ReviewInput }
  | { ok: false; errors: ReviewFieldErrors; spam?: boolean } {
  // حقل مخفي (honeypot): البشر لا يرونه، والبوتات تملؤه
  if (String(fd.get("website") ?? "").trim()) return { ok: false, errors: {}, spam: true };

  const name = clean(String(fd.get("name") ?? ""), false);
  const body = clean(String(fd.get("body") ?? ""), true);
  const ratingRaw = String(fd.get("rating") ?? "");
  const rating = /^[1-5]$/.test(ratingRaw) ? Number(ratingRaw) : 0;

  const errors: ReviewFieldErrors = {};
  if (charCount(name) < 2) errors.name = "أدخل اسمك (حرفان على الأقل)";
  else if (charCount(name) > REVIEW_NAME_MAX) errors.name = `الاسم ${REVIEW_NAME_MAX} حرفاً كحد أقصى`;
  if (!rating) errors.rating = "اختر تقييمك من 1 إلى 5 نجوم";
  if (charCount(body) < REVIEW_BODY_MIN) errors.body = `اكتب تعليقاً (${REVIEW_BODY_MIN} أحرف على الأقل)`;
  else if (charCount(body) > REVIEW_BODY_MAX) errors.body = `التعليق ${REVIEW_BODY_MAX} حرف كحد أقصى`;

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data: { name, rating, body } };
}

export function summarize(ratings: number[]) {
  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const r of ratings) if (r >= 1 && r <= 5) distribution[5 - r]++;
  const total = ratings.length;
  const average = total ? Math.round((ratings.reduce((a, b) => a + b, 0) / total) * 10) / 10 : 0;
  return { average, total, distribution };
}
