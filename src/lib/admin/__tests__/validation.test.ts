import { describe, expect, it } from "vitest";
import { parseEventForm, parseMatchForm, parseStatsForm, validateStreamUrl } from "../validation";

const fd = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });
const L = "a0000000-0000-4000-8000-000000000001";
const H = "b0000000-0000-4000-8000-000000000001";
const A = "b0000000-0000-4000-8000-000000000002";

describe("validateStreamUrl", () => {
  it("يقبل https ورابط محلي", () => {
    expect(validateStreamUrl("https://cdn.example.com/live/master.m3u8")).toBe("https://cdn.example.com/live/master.m3u8");
    expect(validateStreamUrl("http://localhost:8090/master.m3u8")).toBeTruthy();
    expect(validateStreamUrl("")).toBeNull();
  });
  it("يرفض javascript و http الخارجي والنصوص", () => {
    expect(validateStreamUrl("javascript:alert(1)")).toBe(false);
    expect(validateStreamUrl("http://evil.com/a.m3u8")).toBe(false);
    expect(validateStreamUrl("not a url")).toBe(false);
  });
});

describe("parseMatchForm", () => {
  const base = { league_id: L, home_team_id: H, away_team_id: A, kickoff_at: "2026-11-07T21:30", status: "scheduled" };
  it("يحوّل الموعد من توقيت البحرين إلى UTC", () => {
    const r = parseMatchForm(fd(base));
    expect(r.ok && r.data.kickoff_at).toBe("2026-11-07T18:30:00.000Z");
  });
  it("يرفض نفس الفريق ورابط بث غير آمن وحالة مجهولة", () => {
    const r = parseMatchForm(fd({ ...base, away_team_id: H, stream_url: "javascript:x", status: "hacked" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["away_team_id", "status", "stream_url"]);
  });
});

describe("parseEventForm", () => {
  it("التبديل يتطلب اللاعب الخارج", () => {
    const r = parseEventForm(fd({ match_id: H, type: "substitution", team: "home", minute: "60", player: "X" }));
    expect(!r.ok && r.errors.secondary_player).toBeTruthy();
  });
  it("دقيقة خارج النطاق ووقت بدل ضائع غير صالح", () => {
    const r = parseEventForm(fd({ match_id: H, type: "goal", team: "away", minute: "200", extra_minute: "40", player: "X" }));
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(["extra_minute", "minute"]);
  });
  it("هدف صحيح", () => {
    const r = parseEventForm(fd({ match_id: H, type: "goal", team: "away", minute: "90", extra_minute: "3", player: " صلاح " }));
    expect(r).toEqual({ ok: true, data: expect.objectContaining({ minute: 90, extra_minute: 3, player: "صلاح", team: "away" }) });
  });
});

describe("parseStatsForm", () => {
  it("يتجاهل الفارغ ويتحقق من الاستحواذ", () => {
    expect(parseStatsForm(fd({ home_shots: "5", away_shots: "3" }))).toEqual({ ok: true, data: { shots: [5, 3] } });
    expect(parseStatsForm(fd({ home_possession: "60", away_possession: "30" })).ok).toBe(false);
    expect(parseStatsForm(fd({ home_shots: "-1", away_shots: "3" })).ok).toBe(false);
  });
});
