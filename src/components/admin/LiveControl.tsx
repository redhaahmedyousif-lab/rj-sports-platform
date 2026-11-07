"use client";

import { useState, useTransition } from "react";
import type { MatchStatus } from "@/types/database";
import { setMatchMinute, setMatchPhase, setMatchScore, type ActionState } from "@/app/admin-console/actions";
import { STATUS_LABEL } from "@/lib/admin/labels";

interface Props {
  matchId: string;
  status: MatchStatus;
  minute: number | null;
  homeScore: number;
  awayScore: number;
  homeName: string;
  awayName: string;
}

/** لوحة التحكم المباشر: حالة المباراة، الدقيقة، والنتيجة — كل ضغطة تُنشر فوراً للمتابعين عبر Realtime */
export function LiveControl(props: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingScore, setEditingScore] = useState(false);

  const run = (fn: () => Promise<ActionState>) =>
    start(async () => {
      const res = await fn();
      setError(res.ok ? null : (res.message ?? "تعذّر التنفيذ"));
    });

  const { matchId, status, minute } = props;
  const live = status === "live";
  const phases: { id: string; label: string; show: boolean; cls: string }[] = [
    { id: "kickoff", label: "▶ انطلاق المباراة", show: status === "scheduled" || status === "postponed", cls: "bg-brand text-brand-fg" },
    { id: "halftime", label: "⏸ نهاية الشوط الأول", show: live && (minute ?? 0) <= 50, cls: "bg-gold text-black" },
    { id: "second_half", label: "▶ بداية الشوط الثاني", show: status === "halftime", cls: "bg-brand text-brand-fg" },
    { id: "fulltime", label: "⏹ نهاية المباراة", show: live || status === "halftime", cls: "bg-live text-white" },
    { id: "postpone", label: "تأجيل", show: status === "scheduled", cls: "bg-surface-2 ring-1 ring-border" },
    { id: "reset", label: "إعادة لـ «مجدولة»", show: status === "finished" || status === "postponed" || status === "cancelled", cls: "bg-surface-2 ring-1 ring-border" },
  ];

  return (
    <section aria-label="التحكم المباشر" aria-busy={pending} className="space-y-5 rounded-xl border border-live/30 bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-extrabold">
          {live && <span className="size-2 animate-pulse rounded-full bg-live" />}
          التحكم المباشر
        </h2>
        <span data-testid="admin-status" className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_LABEL[status].cls}`}>
          {STATUS_LABEL[status].text}
        </span>
      </div>

      {/* النتيجة */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
        <p className="truncate font-bold">{props.homeName}</p>
        {editingScore ? (
          <form
            className="flex items-center gap-2"
            dir="ltr"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              run(async () => {
                const r = await setMatchScore(matchId, Number(fd.get("home")), Number(fd.get("away")));
                if (r.ok) setEditingScore(false);
                return r;
              });
            }}
          >
            <input name="away" type="number" min={0} max={99} defaultValue={props.awayScore} aria-label={`أهداف ${props.awayName}`} className="w-14 rounded-lg border border-border bg-bg py-2 text-center text-xl font-bold" />
            <span>-</span>
            <input name="home" type="number" min={0} max={99} defaultValue={props.homeScore} aria-label={`أهداف ${props.homeName}`} className="w-14 rounded-lg border border-border bg-bg py-2 text-center text-xl font-bold" />
            <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-bold text-brand-fg">حفظ</button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEditingScore(true)}
            title="تصحيح النتيجة يدوياً"
            data-testid="admin-score"
            dir="ltr"
            className="rounded-xl bg-surface-2 px-5 py-2 text-4xl font-extrabold tabular-nums ring-1 ring-border hover:ring-brand"
          >
            {props.awayScore} - {props.homeScore}
          </button>
        )}
        <p className="truncate font-bold">{props.awayName}</p>
      </div>
      <p className="-mt-3 text-center text-[11px] text-muted">النتيجة تتحدث تلقائياً مع أحداث الأهداف — اضغط عليها للتصحيح اليدوي</p>

      {/* الدقيقة */}
      {live && (
        <div className="flex items-center justify-center gap-2">
          <MinuteButton label="−1" onClick={() => run(() => setMatchMinute(matchId, Math.max(0, (minute ?? 0) - 1)))} />
          <span data-testid="admin-minute" className="min-w-20 rounded-lg bg-live/15 py-2 text-center text-xl font-extrabold tabular-nums text-live">
            {minute ?? 0}&apos;
          </span>
          <MinuteButton label="+1" onClick={() => run(() => setMatchMinute(matchId, Math.min(130, (minute ?? 0) + 1)))} />
          <MinuteButton label="+5" onClick={() => run(() => setMatchMinute(matchId, Math.min(130, (minute ?? 0) + 5)))} />
        </div>
      )}

      {/* الحالة */}
      <div className="flex flex-wrap justify-center gap-2">
        {phases
          .filter((p) => p.show)
          .map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={pending}
              onClick={() => run(() => setMatchPhase(matchId, p.id))}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition hover:brightness-110 disabled:opacity-50 ${p.cls}`}
            >
              {p.label}
            </button>
          ))}
      </div>

      {error && (
        <p role="alert" className="text-center text-sm text-live">
          {error}
        </p>
      )}
    </section>
  );
}

function MinuteButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={`الدقيقة ${label}`} className="rounded-lg bg-surface-2 px-3 py-2 font-bold tabular-nums ring-1 ring-border hover:bg-border">
      {label}
    </button>
  );
}
