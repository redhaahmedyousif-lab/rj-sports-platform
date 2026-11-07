"use client";

import { useState } from "react";
import { deleteMatch } from "@/app/admin-console/actions";

/** حذف المباراة مع خطوة تأكيد (الحذف نهائي ويشمل أحداثها) */
export function DeleteMatchButton({ matchId, label }: { matchId: string; label: string }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="rounded-xl border border-live/30 p-5">
      <h2 className="mb-1 font-bold text-live">منطقة الخطر</h2>
      <p className="mb-3 text-sm text-muted">حذف المباراة نهائي ويشمل كل أحداثها وإحصائياتها.</p>
      {confirming ? (
        <form action={deleteMatch} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={matchId} />
          <span className="text-sm">حذف «{label}» نهائياً؟</span>
          <button type="submit" className="rounded-lg bg-live px-4 py-2 text-sm font-bold text-white">
            نعم، احذف
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="rounded-lg px-4 py-2 text-sm text-muted">
            إلغاء
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="rounded-lg px-4 py-2 text-sm font-bold text-live ring-1 ring-live/40 hover:bg-live/10">
          حذف المباراة
        </button>
      )}
    </div>
  );
}
