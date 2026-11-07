"use client";

import { useActionState } from "react";
import type { League, MatchStatus, Team } from "@/types/database";
import { saveMatch, type ActionState } from "@/app/admin-console/actions";
import { STATUS_LABEL } from "@/lib/admin/labels";
import { useSubmit } from "./useSubmit";

export interface MatchFormValues {
  id?: string;
  league_id?: string;
  home_team_id?: string;
  away_team_id?: string;
  kickoff_local?: string; // datetime-local بتوقيت التطبيق
  status?: MatchStatus;
  venue?: string | null;
  round?: string | null;
  stream_url?: string | null;
  is_featured?: boolean;
}

/** نموذج إضافة/تعديل مباراة — التحقق النهائي يتم في الخادم (parseMatchForm) */
export function MatchForm({
  values = {},
  leagues,
  teams,
  timezone,
}: {
  values?: MatchFormValues;
  leagues: League[];
  teams: Team[];
  timezone: string;
}) {
  const [state, action, pending] = useActionState(saveMatch, {} as ActionState);
  const err = (k: string) => state.errors?.[k];
  const onSubmit = useSubmit(action);

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <Field label="البطولة" error={err("league_id")} htmlFor="league_id">
        <select id="league_id" name="league_id" defaultValue={values.league_id ?? ""} className={input(err("league_id"))} required>
          <option value="" disabled>
            اختر البطولة…
          </option>
          {leagues.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الفريق المضيف" error={err("home_team_id")} htmlFor="home_team_id">
          <TeamSelect id="home_team_id" teams={teams} value={values.home_team_id} invalid={err("home_team_id")} />
        </Field>
        <Field label="الفريق الضيف" error={err("away_team_id")} htmlFor="away_team_id">
          <TeamSelect id="away_team_id" teams={teams} value={values.away_team_id} invalid={err("away_team_id")} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`موعد الانطلاق (${timezone})`} error={err("kickoff_at")} htmlFor="kickoff_at">
          <input
            id="kickoff_at"
            name="kickoff_at"
            type="datetime-local"
            dir="ltr"
            defaultValue={values.kickoff_local}
            className={input(err("kickoff_at"))}
            required
          />
        </Field>
        <Field label="الحالة" error={err("status")} htmlFor="status">
          <select id="status" name="status" defaultValue={values.status ?? "scheduled"} className={input(err("status"))}>
            {Object.entries(STATUS_LABEL).map(([value, { text }]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الملعب" htmlFor="venue">
          <input id="venue" name="venue" defaultValue={values.venue ?? ""} maxLength={120} className={input()} />
        </Field>
        <Field label="الجولة / الدور" htmlFor="round">
          <input id="round" name="round" defaultValue={values.round ?? ""} maxLength={60} placeholder="مثال: الجولة 12" className={input()} />
        </Field>
      </div>

      <Field label="رابط البث HLS (m3u8)" error={err("stream_url")} htmlFor="stream_url" hint="اتركه فارغاً إذا لا يوجد بث. يجب أن يبدأ بـ https://">
        <input
          id="stream_url"
          name="stream_url"
          type="url"
          dir="ltr"
          defaultValue={values.stream_url ?? ""}
          placeholder="https://cdn.example.com/live/match/master.m3u8"
          className={input(err("stream_url"))}
        />
      </Field>

      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="is_featured" defaultChecked={values.is_featured} className="size-4 accent-brand" />
        مباراة مميزة (تظهر كبطاقة كبيرة في الرئيسية)
      </label>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <button type="submit" disabled={pending} className="rounded-lg bg-brand px-6 py-2.5 font-bold text-brand-fg disabled:opacity-60">
          {pending ? "جارٍ الحفظ…" : values.id ? "حفظ التعديلات" : "إنشاء المباراة"}
        </button>
        {state.message && (
          <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-brand" : "text-live"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

function TeamSelect({ id, teams, value, invalid }: { id: string; teams: Team[]; value?: string; invalid?: string }) {
  return (
    <select id={id} name={id} defaultValue={value ?? ""} className={input(invalid)} required>
      <option value="" disabled>
        اختر الفريق…
      </option>
      {teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
          {t.short_name ? ` (${t.short_name})` : ""}
        </option>
      ))}
    </select>
  );
}

export function input(error?: string) {
  return `w-full rounded-lg border bg-bg px-3 py-2.5 text-sm outline-none transition focus:border-brand ${
    error ? "border-live" : "border-border"
  }`;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-live">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}
