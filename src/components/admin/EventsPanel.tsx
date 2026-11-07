"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import type { MatchEvent, MatchEventType } from "@/types/database";
import { addMatchEvent, deleteMatchEvent, type ActionState } from "@/app/admin-console/actions";
import { EVENT_LABEL } from "@/lib/admin/labels";
import { Field, input } from "./MatchForm";
import { useSubmit } from "./useSubmit";

const QUICK: { type: MatchEventType; label: string }[] = [
  { type: "goal", label: "⚽ هدف" },
  { type: "yellow_card", label: "🟨 صفراء" },
  { type: "red_card", label: "🟥 حمراء" },
  { type: "substitution", label: "🔁 تبديل" },
  { type: "var", label: "📺 VAR" },
];

const formatMinute = (e: Pick<MatchEvent, "minute" | "extra_minute">) =>
  e.extra_minute ? `${e.minute}+${e.extra_minute}'` : `${e.minute}'`;

/** إضافة الأحداث وحذفها — الأهداف تحدّث النتيجة تلقائياً في قاعدة البيانات */
export function EventsPanel({
  matchId,
  currentMinute,
  events,
  homeName,
  awayName,
}: {
  matchId: string;
  currentMinute: number | null;
  events: MatchEvent[];
  homeName: string;
  awayName: string;
}) {
  const [state, action, pending] = useActionState(addMatchEvent, {} as ActionState);
  const [type, setType] = useState<MatchEventType>("goal");
  const formRef = useRef<HTMLFormElement>(null);
  const err = (k: string) => state.errors?.[k];
  const onSubmit = useSubmit(action);

  // بعد الإضافة الناجحة: تفريغ أسماء اللاعبين مع الإبقاء على الفريق والنوع
  useEffect(() => {
    if (!state.ok || !formRef.current) return;
    for (const name of ["player", "secondary_player", "detail", "extra_minute"]) {
      const el = formRef.current.elements.namedItem(name) as HTMLInputElement | null;
      if (el) el.value = "";
    }
  }, [state]);

  const isSub = type === "substitution";
  const isGoal = type === "goal" || type === "penalty_goal";

  return (
    <section className="space-y-5 rounded-xl border border-border bg-surface p-5">
      <h2 className="font-extrabold">أحداث المباراة</h2>

      <div className="flex flex-wrap gap-2" role="group" aria-label="نوع سريع">
        {QUICK.map((q) => (
          <button
            key={q.type}
            type="button"
            onClick={() => setType(q.type)}
            aria-pressed={type === q.type}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 transition ${
              type === q.type ? "bg-brand/15 text-brand ring-brand/40" : "ring-border hover:bg-surface-2"
            }`}
          >
            {q.label}
          </button>
        ))}
      </div>

      <form ref={formRef} onSubmit={onSubmit} className="space-y-4" noValidate>
        <input type="hidden" name="match_id" value={matchId} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="نوع الحدث" htmlFor="ev-type" error={err("type")}>
            <select id="ev-type" name="type" value={type} onChange={(e) => setType(e.target.value as MatchEventType)} className={input(err("type"))}>
              {Object.entries(EVENT_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <fieldset className="space-y-1.5">
            <legend className="mb-1.5 text-sm font-semibold">الفريق</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: "home", label: homeName },
                { v: "away", label: awayName },
              ].map((t) => (
                <label key={t.v} className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold has-checked:border-brand has-checked:bg-brand/10">
                  <input type="radio" name="team" value={t.v} defaultChecked={t.v === "home"} className="sr-only" />
                  {t.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="الدقيقة" htmlFor="ev-minute" error={err("minute")}>
            <input id="ev-minute" name="minute" type="number" min={0} max={130} inputMode="numeric" defaultValue={currentMinute ?? ""} key={currentMinute ?? "none"} className={input(err("minute"))} />
          </Field>
          <Field label="بدل ضائع" htmlFor="ev-extra" error={err("extra_minute")}>
            <input id="ev-extra" name="extra_minute" type="number" min={1} max={30} inputMode="numeric" placeholder="+" className={input(err("extra_minute"))} />
          </Field>
          <div className="col-span-2">
            <Field label={isSub ? "اللاعب الداخل" : "اللاعب"} htmlFor="ev-player" error={err("player")}>
              <input id="ev-player" name="player" maxLength={80} className={input(err("player"))} />
            </Field>
          </div>
        </div>

        {(isSub || isGoal) && (
          <Field label={isSub ? "اللاعب الخارج" : "صانع الهدف (اختياري)"} htmlFor="ev-secondary" error={err("secondary_player")}>
            <input id="ev-secondary" name="secondary_player" maxLength={80} className={input(err("secondary_player"))} />
          </Field>
        )}
        {(type === "var" || type === "penalty_missed") && (
          <Field label="التفاصيل" htmlFor="ev-detail">
            <input id="ev-detail" name="detail" maxLength={200} placeholder="مثال: إلغاء الهدف بداعي التسلل" className={input()} />
          </Field>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className="rounded-lg bg-brand px-5 py-2.5 font-bold text-brand-fg disabled:opacity-60">
            {pending ? "جارٍ الإضافة…" : "إضافة الحدث"}
          </button>
          {state.message && (
            <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-brand" : "text-live"}`}>
              {state.message}
            </p>
          )}
        </div>
      </form>

      <ol className="divide-y divide-border rounded-lg ring-1 ring-border" aria-label="قائمة الأحداث">
        {events.map((e) => (
          <EventRow key={e.id} event={e} teamName={e.team === "home" ? homeName : awayName} />
        ))}
        {events.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">لا توجد أحداث بعد.</li>}
      </ol>
    </section>
  );
}

function EventRow({ event, teamName }: { event: MatchEvent; teamName: string }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  return (
    <li data-event-type={event.type} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${pending ? "opacity-40" : ""}`}>
      <span className="w-12 font-bold tabular-nums text-muted">{formatMinute(event)}</span>
      <span className="flex-1">
        <span className="font-semibold">{EVENT_LABEL[event.type].split(" (")[0]}</span> — {event.player}
        {event.secondary_player && <span className="text-muted"> ({event.type === "substitution" ? "خروج" : "صناعة"}: {event.secondary_player})</span>}
        <span className="ms-2 text-xs text-muted">· {teamName}</span>
      </span>
      {confirming ? (
        <span className="flex gap-1">
          <button type="button" onClick={() => start(async () => void (await deleteMatchEvent(event.id)))} className="rounded bg-live px-2 py-1 text-xs font-bold text-white">
            تأكيد الحذف
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="rounded px-2 py-1 text-xs text-muted">
            إلغاء
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} aria-label={`حذف ${EVENT_LABEL[event.type]} ${event.player}`} className="rounded px-2 py-1 text-xs text-muted hover:bg-live/10 hover:text-live">
          حذف
        </button>
      )}
    </li>
  );
}
