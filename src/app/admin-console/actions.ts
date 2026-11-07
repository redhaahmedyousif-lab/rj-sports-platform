"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { MatchStatus } from "@/types/database";
import { requireAdmin } from "@/lib/admin/auth";
import { parseEventForm, parseMatchForm, parseStatsForm, type FieldErrors } from "@/lib/admin/validation";
import { createClient } from "@/lib/supabase/server";

/**
 * كل إجراء يبدأ بـ requireAdmin() (404 لغير المشرف)، ثم يُنفَّذ بجلسة المستخدم نفسه
 * وليس بمفتاح service_role — فسياسات RLS في Supabase تمثل طبقة الحماية الأخيرة.
 */

export interface ActionState {
  ok?: boolean;
  message?: string;
  errors?: FieldErrors;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dbError = (e: { message: string }): ActionState => {
  console.error("[admin action]", e.message);
  return { ok: false, message: "تعذّر الحفظ في قاعدة البيانات. حاول مرة أخرى." };
};

// ---------------- المباريات ----------------

export async function saveMatch(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { basePath } = await requireAdmin();
  const parsed = parseMatchForm(fd);
  if (!parsed.ok) return { ok: false, errors: parsed.errors, message: "راجع الحقول المظللة." };

  const supabase = await createClient();
  const id = String(fd.get("id") ?? "");

  if (id) {
    if (!UUID.test(id)) return { ok: false, message: "مباراة غير صحيحة" };
    const { error } = await supabase.from("matches").update(parsed.data).eq("id", id);
    if (error) return dbError(error);
    refresh();
    return { ok: true, message: "تم حفظ التعديلات ✓" };
  }

  const { data, error } = await supabase.from("matches").insert(parsed.data).select("id").single();
  if (error) return dbError(error);
  redirect(`${basePath}/matches/${data.id}?created=1`);
}

export async function deleteMatch(fd: FormData) {
  const { basePath } = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (UUID.test(id)) {
    const supabase = await createClient();
    const { error } = await supabase.from("matches").delete().eq("id", id);
    if (error) throw new Error("delete failed");
  }
  redirect(`${basePath}/matches?deleted=1`);
}

// ---------------- التحكم المباشر ----------------

const TRANSITIONS: Record<string, { status: MatchStatus; minute?: number | null }> = {
  kickoff: { status: "live", minute: 1 },
  halftime: { status: "halftime", minute: 45 },
  second_half: { status: "live", minute: 46 },
  fulltime: { status: "finished", minute: 90 },
  postpone: { status: "postponed", minute: null },
  reset: { status: "scheduled", minute: null },
};

/** تغيير حالة المباراة بزر واحد (انطلاق، استراحة، شوط ثانٍ، نهاية) */
export async function setMatchPhase(matchId: string, phase: string): Promise<ActionState> {
  await requireAdmin();
  const t = TRANSITIONS[phase];
  if (!UUID.test(matchId) || !t) return { ok: false, message: "طلب غير صحيح" };
  const supabase = await createClient();
  const { error } = await supabase.from("matches").update({ status: t.status, minute: t.minute ?? null }).eq("id", matchId);
  if (error) return dbError(error);
  refresh();
  return { ok: true };
}

/** تحديث الدقيقة (مثلاً +1) */
export async function setMatchMinute(matchId: string, minute: number): Promise<ActionState> {
  await requireAdmin();
  if (!UUID.test(matchId) || !Number.isInteger(minute) || minute < 0 || minute > 130) return { ok: false, message: "دقيقة غير صحيحة" };
  const supabase = await createClient();
  const { error } = await supabase.from("matches").update({ minute }).eq("id", matchId);
  if (error) return dbError(error);
  refresh();
  return { ok: true };
}

/** تصحيح النتيجة يدوياً (عادةً تتحدث تلقائياً مع أحداث الأهداف) */
export async function setMatchScore(matchId: string, home: number, away: number): Promise<ActionState> {
  await requireAdmin();
  const valid = (n: number) => Number.isInteger(n) && n >= 0 && n <= 99;
  if (!UUID.test(matchId) || !valid(home) || !valid(away)) return { ok: false, message: "نتيجة غير صحيحة" };
  const supabase = await createClient();
  const { error } = await supabase.from("matches").update({ home_score: home, away_score: away }).eq("id", matchId);
  if (error) return dbError(error);
  refresh();
  return { ok: true };
}

/** إضافة حدث — الأهداف تحدّث النتيجة في نفس المعاملة (دالة add_match_event في SQL) */
export async function addMatchEvent(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseEventForm(fd);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  const e = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_match_event", {
    p_match_id: e.match_id,
    p_type: e.type,
    p_team: e.team,
    p_minute: e.minute,
    p_extra_minute: e.extra_minute,
    p_player: e.player,
    p_secondary_player: e.secondary_player,
    p_detail: e.detail,
  });
  if (error) return dbError(error);
  refresh();
  return { ok: true, message: "تمت إضافة الحدث ✓" };
}

export async function deleteMatchEvent(eventId: string): Promise<ActionState> {
  await requireAdmin();
  if (!UUID.test(eventId)) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_match_event", { p_event_id: eventId });
  if (error) return dbError(error);
  refresh();
  return { ok: true };
}

export async function saveMatchStats(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(fd.get("match_id") ?? "");
  const parsed = parseStatsForm(fd);
  if (!UUID.test(id)) return { ok: false, message: "مباراة غير صحيحة" };
  if (!parsed.ok) return { ok: false, errors: parsed.errors, message: "راجع القيم المظللة." };
  const supabase = await createClient();
  const { error } = await supabase.from("matches").update({ stats: parsed.data }).eq("id", id);
  if (error) return dbError(error);
  refresh();
  return { ok: true, message: "تم حفظ الإحصائيات ✓" };
}

// ---------------- الفرق والبطولات ----------------

export async function createTeam(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = String(fd.get("name") ?? "").trim().slice(0, 80);
  const short = String(fd.get("short_name") ?? "").trim().toUpperCase().slice(0, 4);
  const logo = String(fd.get("logo_url") ?? "").trim();
  const errors: FieldErrors = {};
  if (name.length < 2) errors.name = "أدخل اسم الفريق";
  if (short && !/^[A-Z0-9]{2,4}$/.test(short)) errors.short_name = "2-4 أحرف إنجليزية";
  if (logo && !/^https:\/\/\S+$/.test(logo)) errors.logo_url = "رابط https فقط";
  if (Object.keys(errors).length) return { ok: false, errors };

  const supabase = await createClient();
  const { error } = await supabase.from("teams").insert({ name, short_name: short || null, logo_url: logo || null });
  if (error) return dbError(error);
  refresh();
  return { ok: true, message: `تمت إضافة «${name}» ✓` };
}

export async function createLeague(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = String(fd.get("name") ?? "").trim().slice(0, 80);
  const country = String(fd.get("country") ?? "").trim().slice(0, 60) || null;
  const priority = Number(fd.get("priority") || 100);
  const errors: FieldErrors = {};
  if (name.length < 2) errors.name = "أدخل اسم البطولة";
  if (!Number.isInteger(priority) || priority < 1 || priority > 999) errors.priority = "رقم بين 1 و 999";
  if (Object.keys(errors).length) return { ok: false, errors };

  const supabase = await createClient();
  const { error } = await supabase.from("leagues").insert({ name, country, priority });
  if (error) return dbError(error);
  refresh();
  return { ok: true, message: `تمت إضافة «${name}» ✓` };
}
