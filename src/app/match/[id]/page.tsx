import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BannerAd } from "@/components/ads/BannerAd";
import { PremiumPromo } from "@/components/ads/PremiumPromo";
import { Lineups } from "@/components/match/Lineups";
import { LiveMatchUpdates } from "@/components/match/LiveMatchUpdates";
import { MatchHeader } from "@/components/match/MatchHeader";
import { MatchStats } from "@/components/match/MatchStats";
import { MatchTabs } from "@/components/match/MatchTabs";
import { MatchTimeline } from "@/components/match/MatchTimeline";
import { MatchCardCompact } from "@/components/matches/MatchCardCompact";
import { StreamPlaceholder } from "@/components/player/StreamPlaceholder";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { getMatchById, getMatchesByDate } from "@/lib/data/matches";
import { isPremiumUser } from "@/lib/data/user";
import { todayKey } from "@/lib/utils/date";
import { hasStarted, isLive } from "@/lib/utils/match";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const match = await getMatchById(id);
  if (!match) return { title: "المباراة غير موجودة" };

  const title = `${match.home_team.name} ضد ${match.away_team.name}`;
  return {
    title,
    description: `${title} — ${match.league.name}: البث المباشر، الأحداث، الإحصائيات والتشكيلة.`,
  };
}

export default async function MatchPage({ params, searchParams }: Props) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const [match, isPremium, todayMatches] = await Promise.all([
    getMatchById(id),
    isPremiumUser(),
    getMatchesByDate(todayKey()),
  ]);

  if (!match) notFound();

  const live = isLive(match.status);
  const canWatch = Boolean(match.stream_url) && hasStarted(match.status);
  const otherLive = todayMatches.filter((m) => m.id !== match.id && isLive(m.status)).slice(0, 6);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <LiveMatchUpdates matchId={match.id} active={live} kickoffAt={match.kickoff_at} />

      <div className="min-w-0 space-y-4">
        {canWatch ? (
          <VideoPlayer
            src={match.stream_url!}
            title={`${match.home_team.name} ضد ${match.away_team.name}`}
            isLive={live}
            isPremium={isPremium}
          />
        ) : (
          <StreamPlaceholder kickoffAt={match.kickoff_at} hasStream={Boolean(match.stream_url)} />
        )}

        <MatchHeader match={match} />

        <BannerAd slot="match-top" hidden={isPremium} />

        <MatchTabs
          initial={tab}
          tabs={[
            { id: "timeline", label: "الأحداث", content: <MatchTimeline match={match} /> },
            { id: "stats", label: "الإحصائيات", content: <MatchStats match={match} /> },
            { id: "lineups", label: "التشكيلة", content: <Lineups match={match} /> },
          ]}
        />
      </div>

      <aside className="space-y-4">
        <div className="space-y-4 lg:sticky lg:top-20">
          {otherLive.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-border bg-surface">
              <h2 className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-sm font-bold">
                <span className="size-1.5 animate-pulse rounded-full bg-live" />
                مباريات مباشرة أخرى
              </h2>
              <ul className="divide-y divide-border">
                {otherLive.map((m) => (
                  <li key={m.id}>
                    <MatchCardCompact match={m} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!isPremium && (
            <div className="hidden lg:block">
              <PremiumPromo />
            </div>
          )}
          <BannerAd slot="match-sidebar" size="rectangle" hidden={isPremium} />
        </div>
      </aside>
    </div>
  );
}
