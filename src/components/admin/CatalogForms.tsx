"use client";

import { useActionState, useEffect, useRef } from "react";
import { createLeague, createTeam, type ActionState } from "@/app/admin-console/actions";
import { Field, input } from "./MatchForm";
import { useSubmit } from "./useSubmit";

export function CatalogForms() {
  const [teamState, teamAction, teamPending] = useActionState(createTeam, {} as ActionState);
  const [leagueState, leagueAction, leaguePending] = useActionState(createLeague, {} as ActionState);
  const teamForm = useRef<HTMLFormElement>(null);
  const leagueForm = useRef<HTMLFormElement>(null);
  const submitTeam = useSubmit(teamAction);
  const submitLeague = useSubmit(leagueAction);
  // التفريغ فقط بعد النجاح — عند الخطأ تبقى القيم ليصححها المشرف
  useEffect(() => {
    if (teamState.ok) teamForm.current?.reset();
  }, [teamState]);
  useEffect(() => {
    if (leagueState.ok) leagueForm.current?.reset();
  }, [leagueState]);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form ref={teamForm} onSubmit={submitTeam} className="space-y-3 rounded-xl border border-border bg-surface p-5" noValidate>
        <h2 className="font-bold">فريق جديد</h2>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Field label="الاسم" htmlFor="team-name" error={teamState.errors?.name}>
            <input id="team-name" name="name" maxLength={80} className={input(teamState.errors?.name)} />
          </Field>
          <Field label="الاختصار" htmlFor="team-short" error={teamState.errors?.short_name}>
            <input id="team-short" name="short_name" maxLength={4} dir="ltr" placeholder="RMA" className={input(teamState.errors?.short_name)} />
          </Field>
        </div>
        <Field label="رابط الشعار (اختياري)" htmlFor="team-logo" error={teamState.errors?.logo_url}>
          <input id="team-logo" name="logo_url" type="url" dir="ltr" placeholder="https://…" className={input(teamState.errors?.logo_url)} />
        </Field>
        <Submit pending={teamPending} label="إضافة الفريق" state={teamState} />
      </form>

      <form ref={leagueForm} onSubmit={submitLeague} className="space-y-3 rounded-xl border border-border bg-surface p-5" noValidate>
        <h2 className="font-bold">بطولة جديدة</h2>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Field label="الاسم" htmlFor="league-name" error={leagueState.errors?.name}>
            <input id="league-name" name="name" maxLength={80} className={input(leagueState.errors?.name)} />
          </Field>
          <Field label="الأولوية" htmlFor="league-priority" error={leagueState.errors?.priority}>
            <input id="league-priority" name="priority" type="number" min={1} max={999} defaultValue={100} className={input(leagueState.errors?.priority)} />
          </Field>
        </div>
        <Field label="الدولة" htmlFor="league-country" hint="الأولوية الأقل تظهر أولاً في الرئيسية">
          <input id="league-country" name="country" maxLength={60} className={input()} />
        </Field>
        <Submit pending={leaguePending} label="إضافة البطولة" state={leagueState} />
      </form>
    </div>
  );
}

function Submit({ pending, label, state }: { pending: boolean; label: string; state: ActionState }) {
  return (
    <div className="flex items-center gap-3">
      <button type="submit" disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-brand-fg disabled:opacity-60">
        {pending ? "…" : label}
      </button>
      {state.message && (
        <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-brand" : "text-live"}`}>
          {state.message}
        </p>
      )}
    </div>
  );
}
