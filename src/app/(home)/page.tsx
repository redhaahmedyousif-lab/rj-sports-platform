import { BannerAd } from "@/components/ads/BannerAd";
import { PremiumPromo } from "@/components/ads/PremiumPromo";
import { DateSelector } from "@/components/matches/DateSelector";
import { FeaturedMatch } from "@/components/matches/FeaturedMatch";
import { LeagueSection } from "@/components/matches/LeagueSection";
import { LiveRefresher } from "@/components/matches/LiveRefresher";
import { MatchFilters, type MatchFilter } from "@/components/matches/MatchFilters";
import { CalendarIcon } from "@/components/ui/icons";
import { getMatchesByDate, groupByLeague } from "@/lib/data/matches";
import { isPremiumUser } from "@/lib/data/user";
import { isValidDateKey, todayKey } from "@/lib/utils/date";
import { isLive } from "@/lib/utils/match";

type SearchParams = Promise<{ date?: string; filter?: string }>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const today = todayKey();
  const date = isValidDateKey(params.date) ? params.date : today;
  const filter: MatchFilter = params.filter === "live" ? "live" : "all";

  const [matches, isPremium] = await Promise.all([getMatchesByDate(date), isPremiumUser()]);

  const liveMatches = matches.filter((m) => isLive(m.status));
  const visible = filter === "live" ? liveMatches : matches;
  const groups = groupByLeague(visible);
  const featured =
    matches.find((m) => m.is_featured && m.stream_url) ?? liveMatches.find((m) => m.stream_url);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <LiveRefresher enabled={liveMatches.length > 0} />

      {/* العمود الرئيسي */}
      <div className="min-w-0 space-y-4">
        <DateSelector selected={date} filter={filter === "live" ? "live" : undefined} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <MatchFilters
            active={filter}
            date={date === today ? undefined : date}
            liveCount={liveMatches.length}
            totalCount={matches.length}
          />
        </div>

        {featured && filter === "all" && <FeaturedMatch match={featured} />}

        <BannerAd slot="home-top" hidden={isPremium} />

        {groups.length === 0 ? (
          <EmptyState live={filter === "live"} />
        ) : (
          groups.map((group, i) => (
            <div key={group.league.id} className="space-y-4">
              <LeagueSection group={group} />
              {/* إعلان بين الدوريات كل 3 أقسام */}
              {i % 3 === 2 && i !== groups.length - 1 && (
                <BannerAd slot={`home-inline-${i}`} hidden={isPremium} />
              )}
            </div>
          ))
        )}
      </div>

      {/* الشريط الجانبي (سطح المكتب) */}
      <aside className="hidden space-y-4 lg:block">
        <div className="sticky top-20 space-y-4">
          {!isPremium && <PremiumPromo />}
          <BannerAd slot="home-sidebar" size="rectangle" hidden={isPremium} />
        </div>
      </aside>
    </div>
  );
}

function EmptyState({ live }: { live: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface py-16 text-center text-muted">
      <CalendarIcon width={32} height={32} />
      <p>{live ? "لا توجد مباريات مباشرة الآن" : "لا توجد مباريات في هذا اليوم"}</p>
    </div>
  );
}
