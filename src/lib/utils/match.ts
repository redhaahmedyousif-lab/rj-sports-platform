import type { MatchStatus } from "@/types/database";

const LIVE_STATUSES: MatchStatus[] = ["live", "halftime"];

/** المباراة جارية الآن (بما فيها الاستراحة) */
export function isLive(status: MatchStatus) {
  return LIVE_STATUSES.includes(status);
}

/** بدأت المباراة (لدينا نتيجة نعرضها) */
export function hasStarted(status: MatchStatus) {
  return status === "live" || status === "halftime" || status === "finished";
}
