import type { MatchWithRelations } from "@/types/database";
import { formatKickoffTime } from "@/lib/utils/date";

/** حالة المباراة: الدقيقة الحية / بين الشوطين / انتهت / موعد الانطلاق */
export function MatchStatusBadge({ match }: { match: MatchWithRelations }) {
  switch (match.status) {
    case "live":
      return (
        <span className="flex items-center gap-1 text-xs font-bold text-live">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-live opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-live" />
          </span>
          {match.minute ?? 0}&apos;
        </span>
      );
    case "halftime":
      return <span className="text-xs font-bold text-live">استراحة</span>;
    case "finished":
      return <span className="text-xs text-muted">انتهت</span>;
    case "postponed":
      return <span className="text-xs text-gold">مؤجلة</span>;
    case "cancelled":
      return <span className="text-xs text-muted line-through">ملغاة</span>;
    default:
      return (
        <span className="text-xs text-muted" dir="ltr">
          {formatKickoffTime(match.kickoff_at)}
        </span>
      );
  }
}
