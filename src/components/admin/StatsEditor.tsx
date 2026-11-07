"use client";

import { useActionState } from "react";
import type { MatchStats } from "@/types/database";
import { saveMatchStats, type ActionState } from "@/app/admin-console/actions";
import { STAT_LABEL } from "@/lib/admin/labels";
import { STAT_KEYS } from "@/lib/admin/validation";
import { useSubmit } from "./useSubmit";

/** تحرير إحصائيات المباراة: عمود للمضيف وعمود للضيف */
export function StatsEditor({ matchId, stats, homeName, awayName }: { matchId: string; stats: MatchStats; homeName: string; awayName: string }) {
  const [state, action, pending] = useActionState(saveMatchStats, {} as ActionState);
  const onSubmit = useSubmit(action);

  return (
    <details className="group rounded-xl border border-border bg-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between p-5 font-extrabold">
        الإحصائيات الحية
        <span className="text-muted transition group-open:rotate-180">⌄</span>
      </summary>
      <form onSubmit={onSubmit} className="space-y-3 border-t border-border p-5" noValidate>
        <input type="hidden" name="match_id" value={matchId} />
        <div className="grid grid-cols-[1fr_5rem_5rem] items-center gap-2 text-xs font-bold text-muted">
          <span />
          <span className="truncate text-center">{homeName}</span>
          <span className="truncate text-center">{awayName}</span>
        </div>
        {STAT_KEYS.map((key) => {
          const value = stats[key];
          const error = state.errors?.[key];
          return (
            <div key={key} className="grid grid-cols-[1fr_5rem_5rem] items-center gap-2">
              <label htmlFor={`home_${key}`} className={`text-sm ${error ? "text-live" : ""}`}>
                {STAT_LABEL[key]}
                {error && <span className="block text-[11px]">{error}</span>}
              </label>
              {(["home", "away"] as const).map((side, i) => (
                <input
                  key={side}
                  id={`${side}_${key}`}
                  name={`${side}_${key}`}
                  type="number"
                  min={0}
                  step={key === "xg" ? 0.01 : 1}
                  inputMode="decimal"
                  defaultValue={value?.[i] ?? ""}
                  aria-label={`${STAT_LABEL[key]} — ${side === "home" ? homeName : awayName}`}
                  className={`rounded-lg border bg-bg px-2 py-1.5 text-center text-sm tabular-nums outline-none focus:border-brand ${error ? "border-live" : "border-border"}`}
                />
              ))}
            </div>
          );
        })}
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={pending} className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-brand-fg disabled:opacity-60">
            {pending ? "جارٍ الحفظ…" : "حفظ الإحصائيات"}
          </button>
          {state.message && (
            <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-brand" : "text-live"}`}>
              {state.message}
            </p>
          )}
        </div>
      </form>
    </details>
  );
}
